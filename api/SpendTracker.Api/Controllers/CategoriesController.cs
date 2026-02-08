using Microsoft.AspNetCore.Mvc;
using SpendTracker.Api.Models;
using SpendTracker.Core.Entities;
using SpendTracker.Core.Interfaces;

namespace SpendTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController(
    ICategoryRepository categoryRepository,
    ILogger<CategoriesController> logger) : ControllerBase
{
    private readonly ICategoryRepository _categoryRepository = categoryRepository;
    private readonly ILogger<CategoriesController> _logger = logger;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAllCategories()
    {
        var categories = await _categoryRepository.GetAllAsync();
        
        var categoryDtos = categories.Select(c => new CategoryDto(
            c.Id,
            c.Name,
            c.Description,
            c.CreatedDate,
            c.Transactions.Count,
            c.Transactions.Where(t => t.Debit.HasValue).Sum(t => t.Debit!.Value)
        ));

        return Ok(categoryDtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> GetCategoryById(int id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        
        if (category == null)
        {
            return NotFound($"Category with ID {id} not found");
        }

        var categoryDto = new CategoryDto(
            category.Id,
            category.Name,
            category.Description,
            category.CreatedDate,
            category.Transactions.Count,
            category.Transactions.Where(t => t.Debit.HasValue).Sum(t => t.Debit!.Value)
        );

        return Ok(categoryDto);
    }

    [HttpGet("{id}/transactions")]
    public async Task<ActionResult<IEnumerable<TransactionDto>>> GetCategoryTransactions(int id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return NotFound($"Category with ID {id} not found");
        }

        var transactions = await _categoryRepository.GetTransactionsByCategoryIdAsync(id);
        
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

        return Ok(transactionDtos);
    }

    [HttpGet("{id}/spending")]
    public async Task<ActionResult<decimal>> GetCategorySpending(int id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return NotFound($"Category with ID {id} not found");
        }

        var totalSpending = await _categoryRepository.GetTotalSpendingByCategoryIdAsync(id);
        return Ok(totalSpending);
    }

    [HttpGet("{id}/spending/monthly")]
    public async Task<ActionResult<CategorySpendingDto>> GetCategoryMonthlySpending(int id, [FromQuery] int year)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return NotFound($"Category with ID {id} not found");
        }

        if (year == 0)
        {
            year = DateTime.UtcNow.Year;
        }

        var monthlyData = await _categoryRepository.GetMonthlySpendingByCategoryIdAsync(id, year);
        
        var monthlyBreakdown = monthlyData.Select(kvp => new MonthlySpendingDto(
            year,
            kvp.Key,
            new DateTime(year, kvp.Key, 1).ToString("MMMM"),
            kvp.Value,
            0 // Transaction count can be added if needed
        )).ToList();

        var totalSpending = await _categoryRepository.GetTotalSpendingByCategoryIdAsync(id);
        var transactions = await _categoryRepository.GetTransactionsByCategoryIdAsync(id);

        var result = new CategorySpendingDto(
            category.Id,
            category.Name,
            totalSpending,
            transactions.Count(),
            monthlyBreakdown
        );

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> CreateCategory([FromBody] CreateCategoryDto createDto)
    {
        // Check if category with same name already exists
        var existing = await _categoryRepository.GetByNameAsync(createDto.Name);
        if (existing != null)
        {
            return Conflict($"Category with name '{createDto.Name}' already exists");
        }

        var category = new Category
        {
            Name = createDto.Name,
            Description = createDto.Description,
            CreatedDate = DateTime.UtcNow
        };

        await _categoryRepository.AddAsync(category);
        await _categoryRepository.SaveChangesAsync();

        var categoryDto = new CategoryDto(
            category.Id,
            category.Name,
            category.Description,
            category.CreatedDate,
            0,
            0
        );

        return CreatedAtAction(nameof(GetCategoryById), new { id = category.Id }, categoryDto);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CategoryDto>> UpdateCategory(int id, [FromBody] UpdateCategoryDto updateDto)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return NotFound($"Category with ID {id} not found");
        }

        // Check if another category with the same name exists
        var existing = await _categoryRepository.GetByNameAsync(updateDto.Name);
        if (existing != null && existing.Id != id)
        {
            return Conflict($"Another category with name '{updateDto.Name}' already exists");
        }

        category.Name = updateDto.Name;
        category.Description = updateDto.Description;

        await _categoryRepository.UpdateAsync(category);
        await _categoryRepository.SaveChangesAsync();

        var categoryDto = new CategoryDto(
            category.Id,
            category.Name,
            category.Description,
            category.CreatedDate,
            category.Transactions.Count,
            category.Transactions.Where(t => t.Debit.HasValue).Sum(t => t.Debit!.Value)
        );

        return Ok(categoryDto);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteCategory(int id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null)
        {
            return NotFound($"Category with ID {id} not found");
        }

        // Check if category has transactions
        if (category.Transactions.Count > 0)
        {
            return BadRequest($"Cannot delete category '{category.Name}' because it has {category.Transactions.Count} associated transactions. Please reassign or remove these transactions first.");
        }

        await _categoryRepository.DeleteAsync(category);
        await _categoryRepository.SaveChangesAsync();

        return NoContent();
    }
}
