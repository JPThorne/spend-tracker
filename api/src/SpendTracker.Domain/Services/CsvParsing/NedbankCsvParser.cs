using System.Globalization;
using SpendTracker.Domain.Entities;

namespace SpendTracker.Domain.Services.CsvParsing;

public class NedbankCsvParser : ICsvParser
{
    public async Task<List<Transaction>> ParseAsync(Stream fileStream, Guid uploadBatchId)
    {
        var transactions = new List<Transaction>();
        var lineNumber = 0;

        using var reader = new StreamReader(fileStream);
        
        // Skip first 3 header lines
        await reader.ReadLineAsync(); // "Statement Enquiry:"
        await reader.ReadLineAsync(); // "Account Number :,..."
        await reader.ReadLineAsync(); // "Account Description :,..."
        await reader.ReadLineAsync(); // "Statement Number:,..."
        lineNumber = 4;

        // Process transaction lines
        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            lineNumber++;
            
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var parts = line.Split(',');
            
            if (parts.Length < 3)
            {
                throw new InvalidDataException($"Line {lineNumber}: Invalid format - expected at least 3 columns");
            }

            var dateStr = parts[0].Trim();
            var description = parts[1].Trim();
            var amountStr = parts[2].Trim();
            var balanceStr = parts.Length > 3 ? parts[3].Trim() : null;

            // Parse date in DDMmmYYYY format (e.g., "02Feb2026")
            if (!DateTime.TryParseExact(dateStr, "ddMMMyyyy", CultureInfo.InvariantCulture, 
                DateTimeStyles.None, out var transactionDate))
            {
                throw new InvalidDataException($"Line {lineNumber}: Invalid date format '{dateStr}'");
            }

            // Parse amount - negative is debit, positive is credit
            if (!decimal.TryParse(amountStr, out var amount))
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
                Description = description,
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
