using Moq;
using SpendTracker.Domain.Entities;
using SpendTracker.Domain.Models;
using SpendTracker.Domain.Repositories;
using SpendTracker.Domain.Services;

namespace SpendTracker.Api.UnitTests;

public class TransactionServiceTests
{
    [Fact]
    public async Task GetByIdAsync_WhenMissing_ReturnsNotFound()
    {
        var transactionRepo = new Mock<ITransactionRepository>(MockBehavior.Strict);
        var categoryRepo = new Mock<ICategoryRepository>(MockBehavior.Strict);
        var csvService = new Mock<ICsvParsingService>(MockBehavior.Strict);

        transactionRepo.Setup(r => r.GetByIdAsync(10)).ReturnsAsync((Transaction?)null);

        var service = new TransactionService(transactionRepo.Object, categoryRepo.Object, csvService.Object);

        var result = await service.GetByIdAsync(10);

        Assert.False(result.Success);
        Assert.Equal(ServiceErrorType.NotFound, result.Error?.Type);
    }

    [Fact]
    public async Task UploadCsvAsync_WhenNoFile_ReturnsValidationError()
    {
        var transactionRepo = new Mock<ITransactionRepository>(MockBehavior.Strict);
        var categoryRepo = new Mock<ICategoryRepository>(MockBehavior.Strict);
        var csvService = new Mock<ICsvParsingService>(MockBehavior.Strict);

        var service = new TransactionService(transactionRepo.Object, categoryRepo.Object, csvService.Object);

        var result = await service.UploadCsvAsync(new CsvUploadRequest("file.csv", Stream.Null));

        Assert.False(result.Success);
        Assert.Equal(ServiceErrorType.Validation, result.Error?.Type);
    }

    [Fact]
    public async Task AssignCategoryAsync_WhenCategoryMissing_ReturnsNotFound()
    {
        var transactionRepo = new Mock<ITransactionRepository>(MockBehavior.Strict);
        var categoryRepo = new Mock<ICategoryRepository>(MockBehavior.Strict);
        var csvService = new Mock<ICsvParsingService>(MockBehavior.Strict);

        transactionRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(new Transaction { Description = "Test" });
        categoryRepo.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((Category?)null);

        var service = new TransactionService(transactionRepo.Object, categoryRepo.Object, csvService.Object);

        var result = await service.AssignCategoryAsync(1, new AssignCategoryDto(99));

        Assert.False(result.Success);
        Assert.Equal(ServiceErrorType.NotFound, result.Error?.Type);
    }
}