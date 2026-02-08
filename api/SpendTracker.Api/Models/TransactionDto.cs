namespace SpendTracker.Api.Models;

public record TransactionDto(
    int Id,
    DateTime TransactionDate,
    string Description,
    decimal? Debit,
    decimal? Credit,
    decimal? Balance,
    int? CategoryId,
    string? CategoryName,
    Guid UploadBatchId,
    DateTime CreatedDate
);

public record AssignCategoryDto(
    int CategoryId
);

public record CsvUploadResultDto(
    int TotalRecords,
    int SuccessfulImports,
    int FailedImports,
    Guid UploadBatchId,
    List<string> Errors
);
