using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using SpendTracker.Api.Models;
using SpendTracker.Core.Entities;
using SpendTracker.Core.Interfaces;

namespace SpendTracker.Api.Services;

public interface ICsvParsingService
{
    Task<CsvUploadResultDto> ParseAndImportCsvAsync(Stream fileStream);
}

public class CsvParsingService(ITransactionRepository transactionRepository) : ICsvParsingService
{
    private readonly ITransactionRepository _transactionRepository = transactionRepository;

    public async Task<CsvUploadResultDto> ParseAndImportCsvAsync(Stream fileStream)
    {
        var uploadBatchId = Guid.NewGuid();
        var transactions = new List<Transaction>();
        var errors = new List<string>();
        var totalRecords = 0;

        try
        {
            using var reader = new StreamReader(fileStream);
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                TrimOptions = TrimOptions.Trim,
                MissingFieldFound = null
            });

            // Read the header
            await csv.ReadAsync();
            csv.ReadHeader();

            int lineNumber = 1;
            while (await csv.ReadAsync())
            {
                lineNumber++;
                totalRecords++;

                try
                {
                    var transactionDateStr = csv.GetField("Transaction Date");
                    var description = csv.GetField("Description");
                    var debitStr = csv.GetField("Debits");
                    var creditStr = csv.GetField("Credits");
                    var balanceStr = csv.GetField("Balance");

                    // Parse transaction date
                    if (!DateTime.TryParse(transactionDateStr, out var transactionDate))
                    {
                        errors.Add($"Line {lineNumber}: Invalid transaction date '{transactionDateStr}'");
                        continue;
                    }

                    // Parse amounts
                    decimal? debit = null;
                    if (!string.IsNullOrWhiteSpace(debitStr))
                    {
                        // Remove any currency symbols or commas
                        debitStr = debitStr.Replace("$", "").Replace(",", "").Trim();
                        if (decimal.TryParse(debitStr, out var debitValue))
                        {
                            debit = Math.Abs(debitValue); // Ensure positive value for debits
                        }
                    }

                    decimal? credit = null;
                    if (!string.IsNullOrWhiteSpace(creditStr))
                    {
                        creditStr = creditStr.Replace("$", "").Replace(",", "").Trim();
                        if (decimal.TryParse(creditStr, out var creditValue))
                        {
                            credit = Math.Abs(creditValue); // Ensure positive value for credits
                        }
                    }

                    decimal? balance = null;
                    if (!string.IsNullOrWhiteSpace(balanceStr))
                    {
                        balanceStr = balanceStr.Replace("$", "").Replace(",", "").Trim();
                        if (decimal.TryParse(balanceStr, out var balanceValue))
                        {
                            balance = balanceValue;
                        }
                    }

                    var transaction = new Transaction
                    {
                        TransactionDate = transactionDate,
                        Description = description ?? "Unknown",
                        Debit = debit,
                        Credit = credit,
                        Balance = balance,
                        UploadBatchId = uploadBatchId,
                        CreatedDate = DateTime.UtcNow
                    };

                    transactions.Add(transaction);
                }
                catch (Exception ex)
                {
                    errors.Add($"Line {lineNumber}: {ex.Message}");
                }
            }

            // Save all transactions
            if (transactions.Count > 0)
            {
                await _transactionRepository.AddRangeAsync(transactions);
                await _transactionRepository.SaveChangesAsync();
            }

            return new CsvUploadResultDto(
                totalRecords,
                transactions.Count,
                totalRecords - transactions.Count,
                uploadBatchId,
                errors
            );
        }
        catch (Exception ex)
        {
            errors.Add($"Failed to parse CSV file: {ex.Message}");
            return new CsvUploadResultDto(totalRecords, 0, totalRecords, uploadBatchId, errors);
        }
    }
}
