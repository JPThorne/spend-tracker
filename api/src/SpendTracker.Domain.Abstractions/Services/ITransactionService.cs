using SpendTracker.Domain.Models;

namespace SpendTracker.Domain.Services;

public interface ITransactionService
{
    Task<ServiceResult<IEnumerable<TransactionDto>>> GetAllAsync(int? categoryId, DateTime? startDate, DateTime? endDate, bool uncategorized);
    Task<ServiceResult<TransactionDto>> GetByIdAsync(int id);
    Task<ServiceResult<CsvUploadResultDto>> UploadCsvAsync(CsvUploadRequest request);
    Task<ServiceResult<TransactionDto>> AssignCategoryAsync(int id, AssignCategoryDto assignDto);
    Task<ServiceResult<TransactionDto>> RemoveCategoryAsync(int id);
    Task<ServiceResult<bool>> DeleteAsync(int id);
    Task<ServiceResult<Dictionary<string, decimal>>> GetMonthlySummaryAsync(int year);
    Task<ServiceResult<object>> DeleteBatchAsync(Guid uploadBatchId);
    Task<ServiceResult<BulkCategorizeResultDto>> BulkCategorizeAsync(BulkCategorizeDto bulkDto);
}