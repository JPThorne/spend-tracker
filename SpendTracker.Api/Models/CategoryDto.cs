namespace SpendTracker.Api.Models;

public record CategoryDto(
    int Id,
    string Name,
    string? Description,
    DateTime CreatedDate,
    int TransactionCount,
    decimal TotalSpending
);

public record CreateCategoryDto(
    string Name,
    string? Description
);

public record UpdateCategoryDto(
    string Name,
    string? Description
);
