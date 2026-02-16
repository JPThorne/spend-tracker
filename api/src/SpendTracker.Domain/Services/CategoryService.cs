using SpendTracker.Domain.Entities;
using SpendTracker.Domain.Models;
using SpendTracker.Domain.Repositories;

namespace SpendTracker.Domain.Services;

public class CategoryService(ICategoryRepository categoryRepository) : ICategoryService
{
    public async Task<ServiceResult<IEnumerable<CategoryDto>>> GetAllAsync(DateTime? startDate, DateTime? endDate)
    {
        var categories = await categoryRepository.GetAllAsync();

        var categoryDtos = categories.Select(category =>
        {
            var transactions = category.Transactions.AsEnumerable();
            if (startDate.HasValue)
            {
                transactions = transactions.Where(t => t.TransactionDate >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                transactions = transactions.Where(t => t.TransactionDate <= endDate.Value);
            }

            var transactionList = transactions.ToList();

            return new CategoryDto(
                category.Id,
                category.Name,
                category.Description,
                category.CreatedDate,
                transactionList.Count,
                transactionList.Where(t => t.Debit.HasValue).Sum(t => t.Debit!.Value)
            );
        });

        return ServiceResult<IEnumerable<CategoryDto>>.Ok(categoryDtos);
    }

    public async Task<ServiceResult<CategoryDto>> GetByIdAsync(int id)
    {
        var category = await categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return ServiceResult<CategoryDto>.Fail(ServiceErrorType.NotFound, $"Category with ID {id} not found");
        }

        var categoryDto = new CategoryDto(
            category.Id,
            category.Name,
            category.Description,
            category.CreatedDate,
            category.Transactions.Count,
            category.Transactions.Where(t => t.Debit.HasValue).Sum(t => t.Debit!.Value)
        );

        return ServiceResult<CategoryDto>.Ok(categoryDto);
    }

    public async Task<ServiceResult<IEnumerable<TransactionDto>>> GetTransactionsAsync(int id, DateTime? startDate, DateTime? endDate)
    {
        var category = await categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return ServiceResult<IEnumerable<TransactionDto>>.Fail(ServiceErrorType.NotFound, $"Category with ID {id} not found");
        }

        var transactions = await categoryRepository.GetTransactionsByCategoryIdAsync(id);

        if (startDate.HasValue)
        {
            transactions = transactions.Where(t => t.TransactionDate >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            transactions = transactions.Where(t => t.TransactionDate <= endDate.Value);
        }

        var transactionDtos = transactions.Select(t => new TransactionDto(
            t.Id,
            t.TransactionDate,
            t.Description,
            t.Debit,
            t.Credit,
            t.Balance,
            t.CategoryId,
            t.Category?.Name,
            t.UploadBatchId,
            t.CreatedDate
        ));

        return ServiceResult<IEnumerable<TransactionDto>>.Ok(transactionDtos);
    }

    public async Task<ServiceResult<decimal>> GetTotalSpendingAsync(int id)
    {
        var category = await categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return ServiceResult<decimal>.Fail(ServiceErrorType.NotFound, $"Category with ID {id} not found");
        }

        var totalSpending = await categoryRepository.GetTotalSpendingByCategoryIdAsync(id);
        return ServiceResult<decimal>.Ok(totalSpending);
    }

    public async Task<ServiceResult<CategorySpendingDto>> GetMonthlySpendingAsync(int id, int year)
    {
        var category = await categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return ServiceResult<CategorySpendingDto>.Fail(ServiceErrorType.NotFound, $"Category with ID {id} not found");
        }

        if (year == 0)
        {
            year = DateTime.UtcNow.Year;
        }

        var monthlyData = await categoryRepository.GetMonthlySpendingByCategoryIdAsync(id, year);

        var monthlyBreakdown = monthlyData.Select(kvp => new MonthlySpendingDto(
            year,
            kvp.Key,
            new DateTime(year, kvp.Key, 1).ToString("MMMM"),
            kvp.Value,
            0
        )).ToList();

        var totalSpending = await categoryRepository.GetTotalSpendingByCategoryIdAsync(id);
        var transactions = await categoryRepository.GetTransactionsByCategoryIdAsync(id);

        var result = new CategorySpendingDto(
            category.Id,
            category.Name,
            totalSpending,
            transactions.Count(),
            monthlyBreakdown
        );

        return ServiceResult<CategorySpendingDto>.Ok(result);
    }

    public async Task<ServiceResult<CategoryDto>> CreateAsync(CreateCategoryDto createDto)
    {
        var existing = await categoryRepository.GetByNameAsync(createDto.Name);
        if (existing != null)
        {
            return ServiceResult<CategoryDto>.Fail(ServiceErrorType.Conflict, $"Category with name '{createDto.Name}' already exists");
        }

        var category = new Category
        {
            Name = createDto.Name,
            Description = createDto.Description,
            CreatedDate = DateTime.UtcNow
        };

        await categoryRepository.AddAsync(category);
        await categoryRepository.SaveChangesAsync();

        var categoryDto = new CategoryDto(
            category.Id,
            category.Name,
            category.Description,
            category.CreatedDate,
            0,
            0
        );

        return ServiceResult<CategoryDto>.Ok(categoryDto);
    }

    public async Task<ServiceResult<CategoryDto>> UpdateAsync(int id, UpdateCategoryDto updateDto)
    {
        var category = await categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return ServiceResult<CategoryDto>.Fail(ServiceErrorType.NotFound, $"Category with ID {id} not found");
        }

        var existing = await categoryRepository.GetByNameAsync(updateDto.Name);
        if (existing != null && existing.Id != id)
        {
            return ServiceResult<CategoryDto>.Fail(ServiceErrorType.Conflict, $"Another category with name '{updateDto.Name}' already exists");
        }

        category.Name = updateDto.Name;
        category.Description = updateDto.Description;

        await categoryRepository.UpdateAsync(category);
        await categoryRepository.SaveChangesAsync();

        var categoryDto = new CategoryDto(
            category.Id,
            category.Name,
            category.Description,
            category.CreatedDate,
            category.Transactions.Count,
            category.Transactions.Where(t => t.Debit.HasValue).Sum(t => t.Debit!.Value)
        );

        return ServiceResult<CategoryDto>.Ok(categoryDto);
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        var category = await categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return ServiceResult<bool>.Fail(ServiceErrorType.NotFound, $"Category with ID {id} not found");
        }

        if (category.Transactions.Count > 0)
        {
            return ServiceResult<bool>.Fail(
                ServiceErrorType.Validation,
                $"Cannot delete category '{category.Name}' because it has {category.Transactions.Count} associated transactions. Please reassign or remove these transactions first.");
        }

        await categoryRepository.DeleteAsync(category);
        await categoryRepository.SaveChangesAsync();

        return ServiceResult<bool>.Ok(true);
    }
}