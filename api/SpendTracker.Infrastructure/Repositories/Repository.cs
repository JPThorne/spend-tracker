using Microsoft.EntityFrameworkCore;
using SpendTracker.Core.Interfaces;
using SpendTracker.Infrastructure.Data;

namespace SpendTracker.Infrastructure.Repositories;

public class Repository<T>(SpendTrackerDbContext context) : IRepository<T> where T : class
{
    protected readonly SpendTrackerDbContext _context = context;

    public virtual async Task<IEnumerable<T>> GetAllAsync()
    {
        return await _context.Set<T>().ToListAsync();
    }

    public virtual async Task<T?> GetByIdAsync(int id)
    {
        return await _context.Set<T>().FindAsync(id);
    }

    public virtual async Task<T> AddAsync(T entity)
    {
        await _context.Set<T>().AddAsync(entity);
        return entity;
    }

    public virtual async Task UpdateAsync(T entity)
    {
        _context.Set<T>().Update(entity);
        await Task.CompletedTask;
    }

    public virtual async Task DeleteAsync(T entity)
    {
        _context.Set<T>().Remove(entity);
        await Task.CompletedTask;
    }

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }
}
