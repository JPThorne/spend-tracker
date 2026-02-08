using Microsoft.EntityFrameworkCore;
using SpendTracker.Core.Entities;
using SpendTracker.Core.Interfaces;
using SpendTracker.Infrastructure.Data;

namespace SpendTracker.Infrastructure.Repositories;

public class CategoryRepository(SpendTrackerDbContext context) : Repository<Category>(context), ICategoryRepository
{
    public async Task<Category?> GetByNameAsync(string name)
    {
        return await _context.Categories
            .FirstOrDefaultAsync(c => c.Name == name);
    }

    public async Task<IEnumerable<Transaction>> GetTransactionsByCategoryIdAsync(int categoryId)
    {
        return await _context.Transactions
            .Where(t => t.CategoryId == categoryId)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();
    }

    public async Task<decimal> GetTotalSpendingByCategoryIdAsync(int categoryId)
    {
        var totalDebits = await _context.Transactions
            .Where(t => t.CategoryId == categoryId && t.Debit.HasValue)
            .SumAsync(t => t.Debit!.Value);

        return totalDebits;
    }

    public async Task<Dictionary<int, decimal>> GetMonthlySpendingByCategoryIdAsync(int categoryId, int year)
    {
        var transactions = await _context.Transactions
            .Where(t => t.CategoryId == categoryId && 
                       t.TransactionDate.Year == year && 
                       t.Debit.HasValue)
            .ToListAsync();

        return transactions
            .GroupBy(t => t.TransactionDate.Month)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(t => t.Debit!.Value)
            );
    }

    public override async Task<IEnumerable<Category>> GetAllAsync()
    {
        return await _context.Categories
            .Include(c => c.Transactions)
            .OrderBy(c => c.Name)
            .ToListAsync();
    }

    public override async Task<Category?> GetByIdAsync(int id)
    {
        return await _context.Categories
            .Include(c => c.Transactions)
            .FirstOrDefaultAsync(c => c.Id == id);
    }
}
