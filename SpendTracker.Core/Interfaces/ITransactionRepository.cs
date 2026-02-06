using SpendTracker.Core.Entities;

namespace SpendTracker.Core.Interfaces;

public interface ITransactionRepository : IRepository<Transaction>
{
    Task<IEnumerable<Transaction>> GetByCategoryIdAsync(int categoryId);
    Task<IEnumerable<Transaction>> GetByUploadBatchIdAsync(Guid uploadBatchId);
    Task<IEnumerable<Transaction>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task AddRangeAsync(IEnumerable<Transaction> transactions);
    Task<Dictionary<string, decimal>> GetMonthlySpendingSummaryAsync(int year);
}
