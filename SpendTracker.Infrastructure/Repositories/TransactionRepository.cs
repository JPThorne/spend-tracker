using Microsoft.EntityFrameworkCore;
using SpendTracker.Core.Entities;
using SpendTracker.Core.Interfaces;
using SpendTracker.Infrastructure.Data;

namespace SpendTracker.Infrastructure.Repositories;

public class TransactionRepository(SpendTrackerDbContext context) : Repository<Transaction>(context), ITransactionRepository
{
    public async Task<IEnumerable<Transaction>> GetByCategoryIdAsync(int categoryId)
    {
        return await _context.Transactions
            .Include(t => t.Category)
            .Where(t => t.CategoryId == categoryId)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<Transaction>> GetByUploadBatchIdAsync(Guid uploadBatchId)
    {
        return await _context.Transactions
            .Include(t => t.Category)
            .Where(t => t.UploadBatchId == uploadBatchId)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<Transaction>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _context.Transactions
            .Include(t => t.Category)
            .Where(t => t.TransactionDate >= startDate && t.TransactionDate <= endDate)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();
    }

    public async Task AddRangeAsync(IEnumerable<Transaction> transactions)
    {
        await _context.Transactions.AddRangeAsync(transactions);
    }

    public async Task<Dictionary<string, decimal>> GetMonthlySpendingSummaryAsync(int year)
    {
        var transactions = await _context.Transactions
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
        return await _context.Transactions
            .Include(t => t.Category)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();
    }

    public override async Task<Transaction?> GetByIdAsync(int id)
    {
        return await _context.Transactions
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id);
    }
}
