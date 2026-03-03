using SpendTracker.Domain.Models;

namespace SpendTracker.Domain.Services;

public interface ICsvParsingService
{
    Task<CsvUploadResultDto> ParseAndImportCsvAsync(Stream fileStream, string bankType);
}
