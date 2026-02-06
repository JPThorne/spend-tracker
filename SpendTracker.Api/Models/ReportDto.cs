namespace SpendTracker.Api.Models;

public record MonthlySpendingDto(
    int Year,
    int Month,
    string MonthName,
    decimal TotalSpending,
    int TransactionCount
);

public record CategorySpendingDto(
    int CategoryId,
    string CategoryName,
    decimal TotalSpending,
    int TransactionCount,
    List<MonthlySpendingDto> MonthlyBreakdown
);
