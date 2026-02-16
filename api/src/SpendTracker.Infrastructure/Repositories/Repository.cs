using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SpendTracker.Domain.Repositories;
using SpendTracker.Infrastructure.Data;

namespace SpendTracker.Infrastructure.Repositories;

public class Repository<T>(SpendTrackerDbContext context) : IRepository<T> where T : class
{
    protected readonly SpendTrackerDbContext Context = context;

    public virtual async Task<IEnumerable<T>> GetAllAsync()
    {
        return await Context.Set<T>().ToListAsync();
    }

    public virtual async Task<T?> GetByIdAsync(int id)
    {
        return await Context.Set<T>().FindAsync(id);
    }

    public virtual async Task<T> AddAsync(T entity)
    {
        await Context.Set<T>().AddAsync(entity);
        return entity;
    }

    public virtual async Task UpdateAsync(T entity)
    {
        Context.Set<T>().Update(entity);
        await Task.CompletedTask;
    }

    public virtual async Task DeleteAsync(T entity)
    {
        Context.Set<T>().Remove(entity);
        await Task.CompletedTask;
    }

    public virtual async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate)
    {
        return await Context.Set<T>().AnyAsync(predicate);
    }

    public async Task<int> SaveChangesAsync()
    {
        return await Context.SaveChangesAsync();
    }
}
