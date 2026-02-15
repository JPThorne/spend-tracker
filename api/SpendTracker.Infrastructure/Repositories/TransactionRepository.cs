using Microsoft.EntityFrameworkCore;
using SpendTracker.Core.Entities;
using SpendTracker.Core.Interfaces;
using SpendTracker.Infrastructure.Data;

namespace SpendTracker.Infrastructure.Repositories;

public class TransactionRepository(SpendTrackerDbContext context) : Repository<Transaction>(context), ITransactionRepository
{
    public async Task<IEnumerable<Transaction>> GetByCategoryIdAsync(int categoryId)
    {
        return await Context.Transactions
            .Include(t => t.Category)
            .Where(t => t.CategoryId == categoryId)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<Transaction>> GetByUploadBatchIdAsync(Guid uploadBatchId)
    {
        return await Context.Transactions
            .Include(t => t.Category)
            .Where(t => t.UploadBatchId == uploadBatchId)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<Transaction>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await Context.Transactions
            .Include(t => t.Category)
            .Where(t => t.TransactionDate >= startDate && t.TransactionDate <= endDate)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();
    }

    public async Task AddRangeAsync(IEnumerable<Transaction> transactions)
    {
        await Context.Transactions.AddRangeAsync(transactions);
    }

    public async Task<int> DeleteByBatchIdAsync(Guid uploadBatchId)
    {
        var transactions = await Context.Transactions
            .Where(t => t.UploadBatchId == uploadBatchId)
            .ToListAsync();
        
        var count = transactions.Count;
        Context.Transactions.RemoveRange(transactions);
        
        return count;
    }

    public async Task<Dictionary<string, decimal>> GetMonthlySpendingSummaryAsync(int year)
    {
        var transactions = await Context.Transactions
            .Include(t => t.Category)
            .Where(t => t.TransactionDate.Year == year && t.Debit.HasValue && t.CategoryId.HasValue)
            .ToListAsync();

        return transactions
            .GroupBy(t => $"{t.TransactionDate:yyyy-MM} - {t.Category!.Name}")
            .ToDictionary(
                g => g.Key,
                g => g.Sum(t => t.Debit!.Value)
            );
    }

    public override async Task<IEnumerable<Transaction>> GetAllAsync()
    {
        return await Context.Transactions
            .Include(t => t.Category)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();
    }

    public override async Task<Transaction?> GetByIdAsync(int id)
    {
        return await Context.Transactions
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id);
    }
}
