using SpendTracker.Domain.Models;
using SpendTracker.Domain.Repositories;

namespace SpendTracker.Domain.Services;

public class TransactionService(
    ITransactionRepository transactionRepository,
    ICategoryRepository categoryRepository,
    ICsvParsingService csvParsingService) : ITransactionService
{
    public async Task<ServiceResult<IEnumerable<TransactionDto>>> GetAllAsync(int? categoryId, DateTime? startDate, DateTime? endDate, bool uncategorized)
    {
        IEnumerable<Entities.Transaction> transactions;

        if (categoryId.HasValue)
        {
            transactions = await transactionRepository.GetByCategoryIdAsync(categoryId.Value);
        }
        else if (startDate.HasValue && endDate.HasValue)
        {
            transactions = await transactionRepository.GetByDateRangeAsync(startDate.Value, endDate.Value);
        }
        else
        {
            transactions = await transactionRepository.GetAllAsync();
        }

        if (uncategorized)
        {
            transactions = transactions.Where(t => t.CategoryId == null);
        }

        var transactionDtos = transactions.Select(t => new TransactionDto(
            t.Id,
            t.TransactionDate,
            t.Description,
            t.Debit,
            t.Credit,
            t.Balance,
            t.CategoryId,
            t.Category?.Name,
            t.UploadBatchId,
            t.CreatedDate
        ));

        return ServiceResult<IEnumerable<TransactionDto>>.Ok(transactionDtos);
    }

    public async Task<ServiceResult<TransactionDto>> GetByIdAsync(int id)
    {
        var transaction = await transactionRepository.GetByIdAsync(id);
        if (transaction == null)
        {
            return ServiceResult<TransactionDto>.Fail(ServiceErrorType.NotFound, $"Transaction with ID {id} not found");
        }

        var transactionDto = new TransactionDto(
            transaction.Id,
            transaction.TransactionDate,
            transaction.Description,
            transaction.Debit,
            transaction.Credit,
            transaction.Balance,
            transaction.CategoryId,
            transaction.Category?.Name,
            transaction.UploadBatchId,
            transaction.CreatedDate
        );

        return ServiceResult<TransactionDto>.Ok(transactionDto);
    }

    public async Task<ServiceResult<CsvUploadResultDto>> UploadCsvAsync(CsvUploadRequest request)
    {
        if (request.FileStream == null || request.FileStream.Length == 0)
        {
            return ServiceResult<CsvUploadResultDto>.Fail(ServiceErrorType.Validation, "No file uploaded");
        }

        if (!request.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
        {
            return ServiceResult<CsvUploadResultDto>.Fail(ServiceErrorType.Validation, "File must be a CSV file");
        }

        var result = await csvParsingService.ParseAndImportCsvAsync(request.FileStream);

        if (result.SuccessfulImports == 0)
        {
            return ServiceResult<CsvUploadResultDto>.Fail(ServiceErrorType.Validation, "No transactions imported", result);
        }

        return ServiceResult<CsvUploadResultDto>.Ok(result);
    }

    public async Task<ServiceResult<TransactionDto>> AssignCategoryAsync(int id, AssignCategoryDto assignDto)
    {
        var transaction = await transactionRepository.GetByIdAsync(id);
        if (transaction == null)
        {
            return ServiceResult<TransactionDto>.Fail(ServiceErrorType.NotFound, $"Transaction with ID {id} not found");
        }

        var category = await categoryRepository.GetByIdAsync(assignDto.CategoryId);
        if (category == null)
        {
            return ServiceResult<TransactionDto>.Fail(ServiceErrorType.NotFound, $"Category with ID {assignDto.CategoryId} not found");
        }

        transaction.CategoryId = assignDto.CategoryId;
        await transactionRepository.UpdateAsync(transaction);
        await transactionRepository.SaveChangesAsync();

        transaction = await transactionRepository.GetByIdAsync(id);

        var transactionDto = new TransactionDto(
            transaction!.Id,
            transaction.TransactionDate,
            transaction.Description,
            transaction.Debit,
            transaction.Credit,
            transaction.Balance,
            transaction.CategoryId,
            transaction.Category?.Name,
            transaction.UploadBatchId,
            transaction.CreatedDate
        );

        return ServiceResult<TransactionDto>.Ok(transactionDto);
    }

    public async Task<ServiceResult<TransactionDto>> RemoveCategoryAsync(int id)
    {
        var transaction = await transactionRepository.GetByIdAsync(id);
        if (transaction == null)
        {
            return ServiceResult<TransactionDto>.Fail(ServiceErrorType.NotFound, $"Transaction with ID {id} not found");
        }

        transaction.CategoryId = null;
        await transactionRepository.UpdateAsync(transaction);
        await transactionRepository.SaveChangesAsync();

        var transactionDto = new TransactionDto(
            transaction.Id,
            transaction.TransactionDate,
            transaction.Description,
            transaction.Debit,
            transaction.Credit,
            transaction.Balance,
            null,
            null,
            transaction.UploadBatchId,
            transaction.CreatedDate
        );

        return ServiceResult<TransactionDto>.Ok(transactionDto);
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        var transaction = await transactionRepository.GetByIdAsync(id);
        if (transaction == null)
        {
            return ServiceResult<bool>.Fail(ServiceErrorType.NotFound, $"Transaction with ID {id} not found");
        }

        await transactionRepository.DeleteAsync(transaction);
        await transactionRepository.SaveChangesAsync();

        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<Dictionary<string, decimal>>> GetMonthlySummaryAsync(int year)
    {
        if (year == 0)
        {
            year = DateTime.UtcNow.Year;
        }

        var summary = await transactionRepository.GetMonthlySpendingSummaryAsync(year);
        return ServiceResult<Dictionary<string, decimal>>.Ok(summary);
    }

    public async Task<ServiceResult<object>> DeleteBatchAsync(Guid uploadBatchId)
    {
        var transactions = await transactionRepository.GetByUploadBatchIdAsync(uploadBatchId);
        var transactionList = transactions.ToList();

        if (transactionList.Count == 0)
        {
            return ServiceResult<object>.Fail(ServiceErrorType.NotFound, $"No transactions found with batch ID {uploadBatchId}");
        }

        var categoriesAffected = transactionList
            .Where(t => t.CategoryId.HasValue)
            .Select(t => t.Category?.Name)
            .Distinct()
            .Where(name => name != null)
            .ToList();

        var deletedCount = await transactionRepository.DeleteByBatchIdAsync(uploadBatchId);
        await transactionRepository.SaveChangesAsync();

        return ServiceResult<object>.Ok(new
        {
            deletedCount,
            categoriesAffected
        });
    }

    public async Task<ServiceResult<BulkCategorizeResultDto>> BulkCategorizeAsync(BulkCategorizeDto bulkDto)
    {
        if (bulkDto.TransactionIds == null || bulkDto.TransactionIds.Count == 0)
        {
            return ServiceResult<BulkCategorizeResultDto>.Fail(ServiceErrorType.Validation, "No transaction IDs provided");
        }

        var category = await categoryRepository.GetByIdAsync(bulkDto.CategoryId);
        if (category == null)
        {
            return ServiceResult<BulkCategorizeResultDto>.Fail(ServiceErrorType.NotFound, $"Category with ID {bulkDto.CategoryId} not found");
        }

        var processed = 0;
        var failed = 0;
        var errors = new List<string>();

        foreach (var transactionId in bulkDto.TransactionIds)
        {
            try
            {
                var transaction = await transactionRepository.GetByIdAsync(transactionId);
                if (transaction == null)
                {
                    failed++;
                    errors.Add($"Transaction ID {transactionId} not found");
                    continue;
                }

                transaction.CategoryId = bulkDto.CategoryId;
                await transactionRepository.UpdateAsync(transaction);
                processed++;
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add($"Error processing transaction ID {transactionId}: {ex.Message}");
            }
        }

        await transactionRepository.SaveChangesAsync();

        var result = new BulkCategorizeResultDto(processed, failed, errors);
        return ServiceResult<BulkCategorizeResultDto>.Ok(result);
    }
}