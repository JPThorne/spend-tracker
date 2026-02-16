using SpendTracker.Domain.Entities;

namespace SpendTracker.Domain.Repositories;

public interface ICategoryRepository : IRepository<Category>
{
    Task<Category?> GetByNameAsync(string name);
    Task<IEnumerable<Transaction>> GetTransactionsByCategoryIdAsync(int categoryId);
    Task<decimal> GetTotalSpendingByCategoryIdAsync(int categoryId);
    Task<Dictionary<int, decimal>> GetMonthlySpendingByCategoryIdAsync(int categoryId, int year);
}
