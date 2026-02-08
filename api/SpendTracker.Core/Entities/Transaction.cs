namespace SpendTracker.Core.Entities;

public class Transaction
{
    public int Id { get; set; }
    public DateTime TransactionDate { get; set; }
    public required string Description { get; set; }
    public decimal? Debit { get; set; }
    public decimal? Credit { get; set; }
    public decimal? Balance { get; set; }
    public int? CategoryId { get; set; }
    public Category? Category { get; set; }
    public Guid UploadBatchId { get; set; }
    public DateTime CreatedDate { get; set; }
}
