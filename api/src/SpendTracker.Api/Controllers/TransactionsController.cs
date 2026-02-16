using Microsoft.AspNetCore.Mvc;
using SpendTracker.Domain.Models;
using SpendTracker.Domain.Services;

namespace SpendTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController(
    ITransactionService transactionService,
    ILogger<TransactionsController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransactionDto>>> GetAllTransactions(
        [FromQuery] int? categoryId = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] bool uncategorized = false)
    {
        var result = await transactionService.GetAllAsync(categoryId, startDate, endDate, uncategorized);
        return Ok(result.Value);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TransactionDto>> GetTransactionById(int id)
    {
        var result = await transactionService.GetByIdAsync(id);
        if (!result.Success)
        {
            return NotFound(result.Error?.Message);
        }

        return Ok(result.Value);
    }

    [HttpPost("upload")]
    public async Task<ActionResult<CsvUploadResultDto>> UploadCsv(IFormFile file)
    {
        if (file == null)
        {
            return BadRequest("No file uploaded");
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await transactionService.UploadCsvAsync(new CsvUploadRequest(file.FileName, stream));

            if (!result.Success)
            {
                if (result.Error?.Type == ServiceErrorType.Validation && result.Value != null)
                {
                    return BadRequest(result.Value);
                }

                return BadRequest(result.Error?.Message);
            }

            return Ok(result.Value);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error uploading CSV file");
            return StatusCode(500, "An error occurred while processing the CSV file");
        }
    }

    [HttpPut("{id:int}/category")]
    public async Task<ActionResult<TransactionDto>> AssignCategory(int id, [FromBody] AssignCategoryDto assignDto)
    {
        var result = await transactionService.AssignCategoryAsync(id, assignDto);
        if (!result.Success)
        {
            return NotFound(result.Error?.Message);
        }

        return Ok(result.Value);
    }

    [HttpDelete("{id:int}/category")]
    public async Task<ActionResult<TransactionDto>> RemoveCategory(int id)
    {
        var result = await transactionService.RemoveCategoryAsync(id);
        if (!result.Success)
        {
            return NotFound(result.Error?.Message);
        }

        return Ok(result.Value);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteTransaction(int id)
    {
        var result = await transactionService.DeleteAsync(id);
        if (!result.Success)
        {
            return NotFound(result.Error?.Message);
        }

        return NoContent();
    }

    [HttpGet("summary/monthly")]
    public async Task<ActionResult<Dictionary<string, decimal>>> GetMonthlySummary([FromQuery] int year)
    {
        var result = await transactionService.GetMonthlySummaryAsync(year);
        return Ok(result.Value);
    }

    [HttpDelete("batch/{uploadBatchId:guid}")]
    public async Task<ActionResult<object>> DeleteBatch(Guid uploadBatchId)
    {
        var result = await transactionService.DeleteBatchAsync(uploadBatchId);
        if (!result.Success)
        {
            return NotFound(result.Error?.Message);
        }

        return Ok(result.Value);
    }

    [HttpPost("bulk-categorize")]
    public async Task<ActionResult<BulkCategorizeResultDto>> BulkCategorize([FromBody] BulkCategorizeDto bulkDto)
    {
        var result = await transactionService.BulkCategorizeAsync(bulkDto);
        if (!result.Success)
        {
            return result.Error?.Type == ServiceErrorType.Validation
                ? BadRequest(result.Error?.Message)
                : NotFound(result.Error?.Message);
        }

        return Ok(result.Value);
    }
}
