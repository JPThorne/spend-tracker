using Microsoft.AspNetCore.Mvc;
using SpendTracker.Api.Models;
using SpendTracker.Api.Services;
using SpendTracker.Domain.Interfaces;

namespace SpendTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController(
    ITransactionRepository transactionRepository,
    ICategoryRepository categoryRepository,
    ICsvParsingService csvParsingService,
    ILogger<TransactionsController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransactionDto>>> GetAllTransactions(
        [FromQuery] int? categoryId = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] bool uncategorized = false)
    {
        IEnumerable<Domain.Entities.Transaction> transactions;

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

        // Filter for uncategorized transactions if requested
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

        return Ok(transactionDtos);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TransactionDto>> GetTransactionById(int id)
    {
        var transaction = await transactionRepository.GetByIdAsync(id);
        
        if (transaction == null)
        {
            return NotFound($"Transaction with ID {id} not found");
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

        return Ok(transactionDto);
    }

    [HttpPost("upload")]
    public async Task<ActionResult<CsvUploadResultDto>> UploadCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded");
        }

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("File must be a CSV file");
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await csvParsingService.ParseAndImportCsvAsync(stream);
            
            if (result.SuccessfulImports == 0)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error uploading CSV file");
            return StatusCode(500, "An error occurred while processing the CSV file");
        }
    }

    [HttpPut("{id:int}/category")]
    public async Task<ActionResult<TransactionDto>> AssignCategory(int id, [FromBody] AssignCategoryDto assignDto)
    {
        var transaction = await transactionRepository.GetByIdAsync(id);
        if (transaction == null)
        {
            return NotFound($"Transaction with ID {id} not found");
        }

        var category = await categoryRepository.GetByIdAsync(assignDto.CategoryId);
        if (category == null)
        {
            return NotFound($"Category with ID {assignDto.CategoryId} not found");
        }

        transaction.CategoryId = assignDto.CategoryId;
        await transactionRepository.UpdateAsync(transaction);
        await transactionRepository.SaveChangesAsync();

        // Reload to get category name
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

        return Ok(transactionDto);
    }

    [HttpDelete("{id:int}/category")]
    public async Task<ActionResult<TransactionDto>> RemoveCategory(int id)
    {
        var transaction = await transactionRepository.GetByIdAsync(id);
        if (transaction == null)
        {
            return NotFound($"Transaction with ID {id} not found");
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

        return Ok(transactionDto);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteTransaction(int id)
    {
        var transaction = await transactionRepository.GetByIdAsync(id);
        if (transaction == null)
        {
            return NotFound($"Transaction with ID {id} not found");
        }

        await transactionRepository.DeleteAsync(transaction);
        await transactionRepository.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("summary/monthly")]
    public async Task<ActionResult<Dictionary<string, decimal>>> GetMonthlySummary([FromQuery] int year)
    {
        if (year == 0)
        {
            year = DateTime.UtcNow.Year;
        }

        var summary = await transactionRepository.GetMonthlySpendingSummaryAsync(year);
        return Ok(summary);
    }

    [HttpDelete("batch/{uploadBatchId:guid}")]
    public async Task<ActionResult<object>> DeleteBatch(Guid uploadBatchId)
    {
        var transactions = await transactionRepository.GetByUploadBatchIdAsync(uploadBatchId);
        var transactionList = transactions.ToList();
        
        if (transactionList.Count == 0)
        {
            return NotFound($"No transactions found with batch ID {uploadBatchId}");
        }

        var categoriesAffected = transactionList
            .Where(t => t.CategoryId.HasValue)
            .Select(t => t.Category?.Name)
            .Distinct()
            .Where(n => n != null)
            .ToList();

        var deletedCount = await transactionRepository.DeleteByBatchIdAsync(uploadBatchId);
        await transactionRepository.SaveChangesAsync();

        return Ok(new
        {
            deletedCount = deletedCount,
            categoriesAffected = categoriesAffected
        });
    }

    [HttpPost("bulk-categorize")]
    public async Task<ActionResult<BulkCategorizeResultDto>> BulkCategorize([FromBody] BulkCategorizeDto bulkDto)
    {
        if (bulkDto.TransactionIds == null || bulkDto.TransactionIds.Count == 0)
        {
            return BadRequest("No transaction IDs provided");
        }

        // Verify category exists
        var category = await categoryRepository.GetByIdAsync(bulkDto.CategoryId);
        if (category == null)
        {
            return NotFound($"Category with ID {bulkDto.CategoryId} not found");
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
                logger.LogError(ex, "Error categorizing transaction {TransactionId}", transactionId);
            }
        }

        // Save all changes at once
        await transactionRepository.SaveChangesAsync();

        var result = new BulkCategorizeResultDto(processed, failed, errors);
        return Ok(result);
    }
}
