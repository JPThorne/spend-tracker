using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using SpendTracker.Domain.Entities;

namespace SpendTracker.Domain.Services.CsvParsing;

public class AbsaCsvParser : ICsvParser
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

        // Read header
        await csv.ReadAsync();
        csv.ReadHeader();

        while (await csv.ReadAsync())
        {
            lineNumber++;

            var dateStr = csv.GetField("Date");
            var description = csv.GetField("Description");
            var amountStr = csv.GetField("Amount");
            var balanceStr = csv.GetField("Balance");

            // Parse date in YYYYMMDD format
            if (!DateTime.TryParseExact(dateStr, "yyyyMMdd", CultureInfo.InvariantCulture, 
                DateTimeStyles.None, out var transactionDate))
            {
                throw new InvalidDataException($"Line {lineNumber}: Invalid date format '{dateStr}'");
            }

            // Parse amount - negative is debit, positive is credit
            if (!decimal.TryParse(amountStr, CultureInfo.InvariantCulture, out var amount))
            {
                throw new InvalidDataException($"Line {lineNumber}: Invalid amount '{amountStr}'");
            }

            decimal? debit = null;
            decimal? credit = null;

            if (amount < 0)
            {
                debit = Math.Abs(amount);
            }
            else if (amount > 0)
            {
                credit = amount;
            }

            decimal? balance = null;
            if (!string.IsNullOrWhiteSpace(balanceStr))
            {
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
