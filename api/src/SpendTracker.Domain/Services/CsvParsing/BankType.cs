namespace SpendTracker.Domain.Services.CsvParsing;

public static class BankType
{
    public const string Investec = "investec";
    public const string Absa = "absa";
    public const string Nedbank = "nedbank";

    public static bool IsValid(string bankType)
    {
        return bankType.ToLowerInvariant() switch
        {
            Investec => true,
            Absa => true,
            Nedbank => true,
            _ => false
        };
    }

    public static string[] GetAll()
    {
        return new[] { Investec, Absa, Nedbank };
    }
}
