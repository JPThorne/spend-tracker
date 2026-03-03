using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using SpendTracker.Domain.Entities;

namespace SpendTracker.Domain.Services.CsvParsing;

public class InvestecCsvParser : ICsvParser
{
    public async Task<List<Transaction>> ParseAsync(Stream fileStream, Guid uploadBatchId)
    {
        var transactions = new List<Transaction>();
        var lineNumber = 1;

        using var reader = new StreamReader(fileStream);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            TrimOptions = TrimOptions.Trim,
            MissingFieldFound = null
        });

        // Skip first line
        await csv.ReadAsync();

        // Read header
        await csv.ReadAsync();
        csv.ReadHeader();

        while (await csv.ReadAsync())
        {
            lineNumber++;

            var transactionDateStr = csv.GetField("Transaction Date");
            var description = csv.GetField("Description");
            var debitStr = csv.GetField("Debits");
            var creditStr = csv.GetField("Credits");
            var balanceStr = csv.GetField("Balance");

            if (!DateTime.TryParse(transactionDateStr, out var transactionDate))
            {
                throw new InvalidDataException($"Line {lineNumber}: Invalid transaction date '{transactionDateStr}'");
            }

            decimal? debit = null;
            if (!string.IsNullOrWhiteSpace(debitStr))
            {
                debitStr = debitStr.Replace("$", "").Replace(",", "").Trim();
                if (decimal.TryParse(debitStr, out var debitValue))
                {
                    debit = Math.Abs(debitValue);
                }
            }

            decimal? credit = null;
            if (!string.IsNullOrWhiteSpace(creditStr))
            {
                creditStr = creditStr.Replace("$", "").Replace(",", "").Trim();
                if (decimal.TryParse(creditStr, out var creditValue))
                {
                    credit = Math.Abs(creditValue);
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

        return transactions;
    }
}
