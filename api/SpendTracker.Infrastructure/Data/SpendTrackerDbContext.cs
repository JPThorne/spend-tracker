using Microsoft.EntityFrameworkCore;
using SpendTracker.Core.Entities;

namespace SpendTracker.Infrastructure.Data;

public class SpendTrackerDbContext(DbContextOptions<SpendTrackerDbContext> options) : DbContext(options)
{
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Debit).HasPrecision(18, 2);
            entity.Property(e => e.Credit).HasPrecision(18, 2);
            entity.Property(e => e.Balance).HasPrecision(18, 2);
            entity.Property(e => e.TransactionDate).IsRequired();
            entity.Property(e => e.UploadBatchId).IsRequired();
            entity.Property(e => e.CreatedDate).IsRequired();
            
            entity.HasIndex(e => e.TransactionDate);
            entity.HasIndex(e => e.UploadBatchId);
            entity.HasIndex(e => e.CategoryId);

            entity.HasOne(e => e.Category)
                .WithMany(c => c.Transactions)
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.CreatedDate).IsRequired();
            
            entity.HasIndex(e => e.Name).IsUnique();
        });
    }
}
