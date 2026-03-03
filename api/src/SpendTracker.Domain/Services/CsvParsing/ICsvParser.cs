using SpendTracker.Domain.Entities;

namespace SpendTracker.Domain.Services.CsvParsing;

public interface ICsvParser
{
    Task<List<Transaction>> ParseAsync(Stream fileStream, Guid uploadBatchId);
}
