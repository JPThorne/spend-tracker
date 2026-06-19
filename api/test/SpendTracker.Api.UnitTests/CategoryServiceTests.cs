using Moq;
using SpendTracker.Domain.Entities;
using SpendTracker.Domain.Models;
using SpendTracker.Domain.Repositories;
using SpendTracker.Domain.Services;

namespace SpendTracker.Api.UnitTests;

public class CategoryServiceTests
{
    [Fact]
    public async Task GetByIdAsync_WhenMissing_ReturnsNotFound()
    {
        var repository = new Mock<ICategoryRepository>(MockBehavior.Strict);
        repository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync((Category?)null);
        var transactionRepository = new Mock<ITransactionRepository>(MockBehavior.Strict);

        var service = new CategoryService(repository.Object, transactionRepository.Object);

        var result = await service.GetByIdAsync(5);

        Assert.False(result.Success);
        Assert.Equal(ServiceErrorType.NotFound, result.Error?.Type);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task CreateAsync_WhenNameExists_ReturnsConflict()
    {
        var repository = new Mock<ICategoryRepository>(MockBehavior.Strict);
        repository.Setup(r => r.GetByNameAsync("Food")).ReturnsAsync(new Category { Name = "Food" });
        var transactionRepository = new Mock<ITransactionRepository>(MockBehavior.Strict);

        var service = new CategoryService(repository.Object, transactionRepository.Object);

        var result = await service.CreateAsync(new CreateCategoryDto("Food", null));

        Assert.False(result.Success);
        Assert.Equal(ServiceErrorType.Conflict, result.Error?.Type);
    }

    [Fact]
    public async Task DeleteAsync_WithTransactions_Succeeds()
    {
        var category = new Category
        {
            Name = "Bills",
            Transactions = new List<Transaction> { new() { Description = "Test" } }
        };

        var repository = new Mock<ICategoryRepository>(MockBehavior.Strict);
        repository.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(category);
        repository.Setup(r => r.DeleteAsync(category)).Returns(Task.CompletedTask);
        repository.Setup(r => r.SaveChangesAsync()).ReturnsAsync(1);
        var transactionRepository = new Mock<ITransactionRepository>(MockBehavior.Strict);

        var service = new CategoryService(repository.Object, transactionRepository.Object);

        var result = await service.DeleteAsync(3);

        Assert.True(result.Success);
    }

    [Fact]
    public async Task DeleteAsync_WithDeleteTransactionsTrue_DeletesTransactionsBeforeCategory()
    {
        var category = new Category
        {
            Name = "Bills",
            Transactions = new List<Transaction> { new() { Description = "Test" } }
        };

        var repository = new Mock<ICategoryRepository>(MockBehavior.Strict);
        repository.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(category);
        repository.Setup(r => r.DeleteAsync(category)).Returns(Task.CompletedTask);
        repository.Setup(r => r.SaveChangesAsync()).ReturnsAsync(1);
        var transactionRepository = new Mock<ITransactionRepository>(MockBehavior.Strict);
        transactionRepository.Setup(r => r.DeleteByCategoryIdAsync(3)).ReturnsAsync(1);

        var service = new CategoryService(repository.Object, transactionRepository.Object);

        var result = await service.DeleteAsync(3, deleteTransactions: true);

        Assert.True(result.Success);
        transactionRepository.Verify(r => r.DeleteByCategoryIdAsync(3), Times.Once);
    }
}