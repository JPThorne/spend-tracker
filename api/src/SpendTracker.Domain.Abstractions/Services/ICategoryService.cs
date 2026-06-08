using SpendTracker.Domain.Models;

namespace SpendTracker.Domain.Services;

public interface ICategoryService
{
    Task<ServiceResult<IEnumerable<CategoryDto>>> GetAllAsync(DateTime? startDate, DateTime? endDate);
    Task<ServiceResult<CategoryDto>> GetByIdAsync(int id);
    Task<ServiceResult<IEnumerable<TransactionDto>>> GetTransactionsAsync(int id, DateTime? startDate, DateTime? endDate);
    Task<ServiceResult<decimal>> GetTotalSpendingAsync(int id);
    Task<ServiceResult<CategorySpendingDto>> GetMonthlySpendingAsync(int id, int year);
    Task<ServiceResult<CategoryDto>> CreateAsync(CreateCategoryDto createDto);
    Task<ServiceResult<CategoryDto>> UpdateAsync(int id, UpdateCategoryDto updateDto);
    Task<ServiceResult<bool>> DeleteAsync(int id);
    Task<ServiceResult<bool>> ReorderAsync(IEnumerable<ReorderCategoryDto> items);
}