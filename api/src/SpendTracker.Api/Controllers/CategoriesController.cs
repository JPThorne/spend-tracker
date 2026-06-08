using Microsoft.AspNetCore.Mvc;
using SpendTracker.Domain.Models;
using SpendTracker.Domain.Services;

namespace SpendTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController(
    ICategoryService categoryService,
    ILogger<CategoriesController> logger) : ControllerBase
{

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAllCategories(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await categoryService.GetAllAsync(startDate, endDate);
        return Ok(result.Value);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> GetCategoryById(int id)
    {
        var result = await categoryService.GetByIdAsync(id);
        if (!result.Success)
        {
            return NotFound(result.Error?.Message);
        }

        return Ok(result.Value);
    }

    [HttpGet("{id:int}/transactions")]
    public async Task<ActionResult<IEnumerable<TransactionDto>>> GetCategoryTransactions(
        int id,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await categoryService.GetTransactionsAsync(id, startDate, endDate);
        if (!result.Success)
        {
            return NotFound(result.Error?.Message);
        }

        return Ok(result.Value);
    }

    [HttpGet("{id:int}/spending")]
    public async Task<ActionResult<decimal>> GetCategorySpending(int id)
    {
        var result = await categoryService.GetTotalSpendingAsync(id);
        if (!result.Success)
        {
            return NotFound(result.Error?.Message);
        }

        return Ok(result.Value);
    }

    [HttpGet("{id:int}/spending/monthly")]
    public async Task<ActionResult<CategorySpendingDto>> GetCategoryMonthlySpending(int id, [FromQuery] int year)
    {
        var result = await categoryService.GetMonthlySpendingAsync(id, year);
        if (!result.Success)
        {
            return NotFound(result.Error?.Message);
        }

        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> CreateCategory([FromBody] CreateCategoryDto createDto)
    {
        var result = await categoryService.CreateAsync(createDto);
        if (!result.Success)
        {
            logger.LogWarning("Create category failed: {Reason} (name={Name})", result.Error?.Message, createDto.Name);
            return Conflict(result.Error?.Message);
        }

        logger.LogInformation("Category created: id={Id} name={Name}", result.Value!.Id, result.Value.Name);
        return CreatedAtAction(nameof(GetCategoryById), new { id = result.Value.Id }, result.Value);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CategoryDto>> UpdateCategory(int id, [FromBody] UpdateCategoryDto updateDto)
    {
        var result = await categoryService.UpdateAsync(id, updateDto);
        if (!result.Success)
        {
            logger.LogWarning("Update category failed: {Reason} (id={Id})", result.Error?.Message, id);
            return result.Error?.Type == ServiceErrorType.NotFound
                ? NotFound(result.Error?.Message)
                : Conflict(result.Error?.Message);
        }

        return Ok(result.Value);
    }

    [HttpPatch("reorder")]
    public async Task<ActionResult> ReorderCategories([FromBody] IEnumerable<ReorderCategoryDto> items)
    {
        await categoryService.ReorderAsync(items);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteCategory(int id)
    {
        var result = await categoryService.DeleteAsync(id);
        if (!result.Success)
        {
            logger.LogWarning("Delete category failed: {Reason} (id={Id})", result.Error?.Message, id);
            return result.Error?.Type == ServiceErrorType.NotFound
                ? NotFound(result.Error?.Message)
                : BadRequest(result.Error?.Message);
        }

        logger.LogInformation("Category deleted: id={Id}", id);
        return NoContent();
    }
}
