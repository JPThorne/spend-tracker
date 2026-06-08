namespace SpendTracker.Domain.Models;

public record CategoryDto(
    int Id,
    string Name,
    string? Description,
    DateTime CreatedDate,
    int TransactionCount,
    decimal TotalSpending,
    int SortOrder
);

public record CreateCategoryDto(
    string Name,
    string? Description
);

public record UpdateCategoryDto(
    string Name,
    string? Description
);

public record ReorderCategoryDto(
    int Id,
    int SortOrder
);