using SpendTracker.Core.Entities;

namespace SpendTracker.Core.Interfaces;

public interface ICategoryRepository : IRepository<Category>
{
    Task<Category?> GetByNameAsync(string name);
    Task<IEnumerable<Transaction>> GetTransactionsByCategoryIdAsync(int categoryId);
    Task<decimal> GetTotalSpendingByCategoryIdAsync(int categoryId);
    Task<Dictionary<int, decimal>> GetMonthlySpendingByCategoryIdAsync(int categoryId, int year);
}
