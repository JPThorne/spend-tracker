using SpendTracker.Domain.Entities;
using SpendTracker.Domain.Models;

namespace SpendTracker.Domain.Repositories;

public interface ICategoryRepository : IRepository<Category>
{
    Task<Category?> GetByNameAsync(string name);
    Task<IEnumerable<Transaction>> GetTransactionsByCategoryIdAsync(int categoryId);
    Task<decimal> GetTotalSpendingByCategoryIdAsync(int categoryId);
    Task<Dictionary<int, decimal>> GetMonthlySpendingByCategoryIdAsync(int categoryId, int year);
    Task<int> GetNextSortOrderAsync();
    Task ReorderAsync(IEnumerable<ReorderCategoryDto> items);
}
