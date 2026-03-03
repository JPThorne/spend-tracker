using SpendTracker.Domain.Entities;
using SpendTracker.Domain.Models;
using SpendTracker.Domain.Repositories;
using SpendTracker.Domain.Services.CsvParsing;

namespace SpendTracker.Domain.Services;

public class CsvParsingService(ITransactionRepository transactionRepository) : ICsvParsingService
{
    public async Task<CsvUploadResultDto> ParseAndImportCsvAsync(Stream fileStream, string bankType)
    {
        var uploadBatchId = Guid.NewGuid();
        var transactions = new List<Transaction>();
        var errors = new List<string>();
        var duplicateWarnings = new List<string>();
        var totalRecords = 0;
        var duplicatesSkipped = 0;

        // Validate bank type
        if (string.IsNullOrWhiteSpace(bankType) || !BankType.IsValid(bankType))
        {
            errors.Add($"Invalid bank type. Supported banks: {string.Join(", ", BankType.GetAll())}");
            return new CsvUploadResultDto(0, 0, 0, 0, uploadBatchId, errors, new List<string>());
        }

        try
        {
            // Select appropriate parser based on bank type
            ICsvParser parser = bankType.ToLowerInvariant() switch
            {
                BankType.Investec => new InvestecCsvParser(),
                BankType.Absa => new AbsaCsvParser(),
                BankType.Nedbank => new NedbankCsvParser(),
                _ => throw new InvalidOperationException($"No parser found for bank type: {bankType}")
            };

            // Parse transactions using selected parser
            transactions = await parser.ParseAsync(fileStream, uploadBatchId);
            totalRecords = transactions.Count;

            // Check for duplicates and filter them out
            var transactionsToImport = new List<Transaction>();
            
            foreach (var transaction in transactions)
            {
                var isDuplicate = await transactionRepository.ExistsAsync(t =>
                    t.TransactionDate.Date == transaction.TransactionDate.Date &&
                    t.Description == transaction.Description &&
                    t.Debit == transaction.Debit &&
                    t.Credit == transaction.Credit &&
                    t.Balance == transaction.Balance
                );

                if (isDuplicate)
                {
                    duplicatesSkipped++;
                    var amount = transaction.Debit.HasValue 
                        ? $"-R {transaction.Debit.Value:F2}" 
                        : (transaction.Credit.HasValue ? $"+R {transaction.Credit.Value:F2}" : "R 0.00");
                    duplicateWarnings.Add($"{transaction.TransactionDate:yyyy-MM-dd} | {transaction.Description} | {amount}");
                }
                else
                {
                    transactionsToImport.Add(transaction);
                }
            }

            // Import non-duplicate transactions
            if (transactionsToImport.Count > 0)
            {
                await transactionRepository.AddRangeAsync(transactionsToImport);
                await transactionRepository.SaveChangesAsync();
            }

            return new CsvUploadResultDto(
                totalRecords,
                transactionsToImport.Count,
                totalRecords - transactionsToImport.Count - duplicatesSkipped,
                duplicatesSkipped,
                uploadBatchId,
                errors,
                duplicateWarnings
            );
        }
        catch (Exception ex)
        {
            errors.Add($"Failed to parse CSV file: {ex.Message}");
            return new CsvUploadResultDto(
                totalRecords,
                0,
                totalRecords,
                0,
                uploadBatchId,
                errors,
                new List<string>()
            );
        }
    }
}
