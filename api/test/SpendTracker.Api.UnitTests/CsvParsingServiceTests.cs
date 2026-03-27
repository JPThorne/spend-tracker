using System.Linq.Expressions;
using System.Text;
using Moq;
using SpendTracker.Domain.Entities;
using SpendTracker.Domain.Repositories;
using SpendTracker.Domain.Services;

namespace SpendTracker.Api.UnitTests;

public class CsvParsingServiceTests
{
    private static MemoryStream CreateCsvStream(params string[] lines)
    {
        // Add the Nedbank header format
        var headerLines = new[]
        {
            "Statement Enquiry:",
            "Account Number :,12345678",
            "Account Description :,Savings Account",
            "Statement Number:,001"
        };
        
        var allLines = headerLines.Concat(lines).ToArray();
        var content = string.Join("\r\n", allLines);
        return new MemoryStream(Encoding.UTF8.GetBytes(content));
    }

    [Fact]
    public async Task ParseAndImportCsvAsync_WithValidCsv_ImportsTransactionsAndSaves()
    {
        var repository = new Mock<ITransactionRepository>(MockBehavior.Strict);
        repository
            .Setup(r => r.ExistsAsync(It.IsAny<Expression<Func<Transaction, bool>>>() ))
            .ReturnsAsync(false);

        List<Transaction>? savedTransactions = null;
        repository
            .Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<Transaction>>()))
            .Callback<IEnumerable<Transaction>>(transactions => savedTransactions = transactions.ToList())
            .Returns(Task.CompletedTask);
        repository.Setup(r => r.SaveChangesAsync()).ReturnsAsync(2);

        var service = new CsvParsingService(repository.Object);

        using var stream = CreateCsvStream(
            "05Jan2024,Grocery Store,-125.50,2874.50",
            "15Jan2024,Salary Deposit,3000.00,5713.75");

        var result = await service.ParseAndImportCsvAsync(stream, "Nedbank");

        Assert.Equal(2, result.TotalRecords);
        Assert.Equal(2, result.SuccessfulImports);
        Assert.Equal(0, result.FailedImports);
        Assert.Equal(0, result.DuplicatesSkipped);

        Assert.NotNull(savedTransactions);
        Assert.Equal(2, savedTransactions!.Count);
        Assert.Equal(125.50m, savedTransactions[0].Debit);
        Assert.Null(savedTransactions[0].Credit);
        Assert.Equal(3000.00m, savedTransactions[1].Credit);

        repository.Verify(r => r.AddRangeAsync(It.IsAny<IEnumerable<Transaction>>()), Times.Once);
        repository.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task ParseAndImportCsvAsync_WithDuplicateTransaction_SkipsDuplicateAndRecordsWarning()
    {
        var repository = new Mock<ITransactionRepository>(MockBehavior.Strict);
        repository
            .SetupSequence(r => r.ExistsAsync(It.IsAny<Expression<Func<Transaction, bool>>>() ))
            .ReturnsAsync(false)
            .ReturnsAsync(true);

        List<Transaction>? savedTransactions = null;
        repository
            .Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<Transaction>>()))
            .Callback<IEnumerable<Transaction>>(transactions => savedTransactions = transactions.ToList())
            .Returns(Task.CompletedTask);
        repository.Setup(r => r.SaveChangesAsync()).ReturnsAsync(1);

        var service = new CsvParsingService(repository.Object);

        using var stream = CreateCsvStream(
            "05Jan2024,Grocery Store,-125.50,2874.50",
            "05Jan2024,Grocery Store,-125.50,2874.50");

        var result = await service.ParseAndImportCsvAsync(stream, "Nedbank");

        Assert.Equal(2, result.TotalRecords);
        Assert.Equal(1, result.SuccessfulImports);
        Assert.Equal(0, result.FailedImports);
        Assert.Equal(1, result.DuplicatesSkipped);
        Assert.Single(result.DuplicateWarnings);
        Assert.Contains("Grocery Store", result.DuplicateWarnings[0]);

        Assert.NotNull(savedTransactions);
        Assert.Single(savedTransactions!);

        repository.Verify(r => r.AddRangeAsync(It.IsAny<IEnumerable<Transaction>>()), Times.Once);
        repository.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task ParseAndImportCsvAsync_WithInvalidDate_ReturnsErrorAndDoesNotSave()
    {
        var repository = new Mock<ITransactionRepository>(MockBehavior.Strict);
        repository
            .Setup(r => r.ExistsAsync(It.IsAny<Expression<Func<Transaction, bool>>>() ))
            .ReturnsAsync(false);

        var service = new CsvParsingService(repository.Object);

        using var stream = CreateCsvStream(
            "not-a-date,Grocery Store,-125.50,2874.50");

        var result = await service.ParseAndImportCsvAsync(stream, "Nedbank");

        Assert.Equal(0, result.TotalRecords);
        Assert.Equal(0, result.SuccessfulImports);
        Assert.Equal(0, result.FailedImports);
        Assert.Equal(0, result.DuplicatesSkipped);
        Assert.Single(result.Errors);
        Assert.Contains("Failed to parse CSV file", result.Errors[0]);

        repository.Verify(r => r.AddRangeAsync(It.IsAny<IEnumerable<Transaction>>()), Times.Never);
        repository.Verify(r => r.SaveChangesAsync(), Times.Never);
    }

    [Fact]
    public async Task ParseAndImportCsvAsync_WithNullStream_ReturnsFailureResult()
    {
        var repository = new Mock<ITransactionRepository>(MockBehavior.Strict);
        var service = new CsvParsingService(repository.Object);

        var result = await service.ParseAndImportCsvAsync(null!, "Nedbank");

        Assert.Equal(0, result.SuccessfulImports);
        Assert.Equal(0, result.DuplicatesSkipped);
        Assert.Single(result.Errors);
        Assert.Contains("Failed to parse CSV file", result.Errors[0]);

        repository.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ParseAndImportCsvAsync_WithNoValidTransactions_DoesNotSave()
    {
        var repository = new Mock<ITransactionRepository>(MockBehavior.Strict);
        repository
            .Setup(r => r.ExistsAsync(It.IsAny<Expression<Func<Transaction, bool>>>() ))
            .ReturnsAsync(false);

        var service = new CsvParsingService(repository.Object);

        using var stream = CreateCsvStream(
            "not-a-date,Grocery Store,-125.50,2874.50",
            "also-bad,Another Store,50.00,2924.50");

        var result = await service.ParseAndImportCsvAsync(stream, "Nedbank");

        Assert.Equal(0, result.TotalRecords);
        Assert.Equal(0, result.SuccessfulImports);
        Assert.Equal(0, result.FailedImports);
        Assert.Equal(0, result.DuplicatesSkipped);
        Assert.Single(result.Errors);

        repository.Verify(r => r.AddRangeAsync(It.IsAny<IEnumerable<Transaction>>()), Times.Never);
        repository.Verify(r => r.SaveChangesAsync(), Times.Never);
    }
}
