# Spend Tracker - Setup Guide

## Quick Start

### 1. Database Setup

Ensure PostgreSQL is installed and running. Then create the database:

```sql
-- Connect to PostgreSQL (using psql, pgAdmin, or DBeaver)
CREATE DATABASE spendtracker;
```

### 2. Update Connection String (if needed)

Edit `SpendTracker.Api/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=spendtracker;Username=YOUR_USERNAME;Password=YOUR_PASSWORD"
  }
}
```

### 3. Apply Database Migrations

From the solution root directory:
```bash
dotnet ef database update --project SpendTracker.Infrastructure --startup-project SpendTracker.Api
```

This will create the required tables:
- `categories` (id, name, description, created_date)
- `transactions` (id, transaction_date, description, debit, credit, balance, category_id, upload_batch_id, created_date)

### 4. Run the API

```bash
cd SpendTracker.Api
dotnet run
```

The API will start on `https://localhost:7XXX` (check console output for exact port).

### 5. Test the API

You can test the API using:
- Browser: Navigate to `https://localhost:7XXX/api/categories`
- Swagger/OpenAPI: `https://localhost:7XXX/openapi/v1.json`
- Postman/Thunder Client/curl

## Testing the Application

### Step 1: Create Categories

```bash
# Create "Groceries" category
curl -X POST https://localhost:7XXX/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Groceries","description":"Food and household items"}'

# Create "Transportation" category
curl -X POST https://localhost:7XXX/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Transportation","description":"Gas, public transit"}'

# Create "Dining" category
curl -X POST https://localhost:7XXX/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Dining","description":"Restaurants and cafes"}'
```

### Step 2: Upload CSV File

Use the provided `sample-transactions.csv`:

```bash
curl -X POST https://localhost:7XXX/api/transactions/upload \
  -F "file=@sample-transactions.csv"
```

Or use a tool like Postman with:
- Method: POST
- URL: `https://localhost:7XXX/api/transactions/upload`
- Body: form-data
- Key: `file` (type: File)
- Value: Select `sample-transactions.csv`

### Step 3: View Transactions

```bash
# Get all transactions
curl https://localhost:7XXX/api/transactions

# Get all categories
curl https://localhost:7XXX/api/categories
```

### Step 4: Assign Transactions to Categories

```bash
# Assign transaction ID 1 to category ID 1
curl -X PUT https://localhost:7XXX/api/transactions/1/category \
  -H "Content-Type: application/json" \
  -d '{"categoryId":1}'
```

### Step 5: View Category Spending

```bash
# Get total spending for category 1
curl https://localhost:7XXX/api/categories/1/spending

# Get monthly spending for category 1 in 2024
curl https://localhost:7XXX/api/categories/1/spending/monthly?year=2024

# Get all transactions in category 1
curl https://localhost:7XXX/api/categories/1/transactions
```

## API Endpoints Reference

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/{id}` - Get specific category
- `POST /api/categories` - Create category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category (only if no transactions assigned)
- `GET /api/categories/{id}/transactions` - Get transactions in category
- `GET /api/categories/{id}/spending` - Get total spending
- `GET /api/categories/{id}/spending/monthly?year={year}` - Monthly breakdown

### Transactions
- `GET /api/transactions` - List all transactions
  - Query params: `?categoryId=1`, `?startDate=2024-01-01&endDate=2024-12-31`
- `GET /api/transactions/{id}` - Get specific transaction
- `POST /api/transactions/upload` - Upload CSV file
- `PUT /api/transactions/{id}/category` - Assign to category
- `DELETE /api/transactions/{id}/category` - Remove from category
- `DELETE /api/transactions/{id}` - Delete transaction
- `GET /api/transactions/summary/monthly?year={year}` - Monthly summary

## Using with DBeaver

1. Open DBeaver
2. Create new PostgreSQL connection:
   - Host: `localhost`
   - Port: `5432`
   - Database: `spendtracker`
   - Username: `postgres` (or your username)
   - Password: your password
3. Test connection
4. You can now view and query the tables directly

Example queries:
```sql
-- View all categories
SELECT * FROM categories;

-- View all transactions
SELECT * FROM transactions;

-- View transactions with their categories
SELECT t.*, c.name as category_name 
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
ORDER BY t.transaction_date DESC;

-- Calculate total spending by category
SELECT c.name, SUM(t.debit) as total_spending, COUNT(*) as transaction_count
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
WHERE t.debit IS NOT NULL
GROUP BY c.name
ORDER BY total_spending DESC;
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check connection string in `appsettings.json`
- Ensure database exists: `psql -l | grep spendtracker`

### Migration Issues
- If migrations fail, check that EF tools are installed: `dotnet ef --version`
- Reinstall if needed: `dotnet tool install --global dotnet-ef`

### Build Errors
- Clean and rebuild: `dotnet clean && dotnet build`
- Restore packages: `dotnet restore`

## Next Steps for Blazor UI

The Blazor project is scaffolded and ready. To complete the UI:

1. Create API client service in Blazor project
2. Add HttpClient configuration in Program.cs
3. Create Razor components for:
   - Category management (list, create, edit, delete)
   - CSV file upload
   - Transaction list with filtering
   - Category assignment interface
   - Monthly spending reports/charts

Example HttpClient configuration for Blazor:
```csharp
builder.Services.AddScoped(sp => new HttpClient 
{ 
    BaseAddress = new Uri("https://localhost:7XXX") 
});
```

## Summary

You now have a fully functional .NET 10 API for managing banking transactions with:
- ✅ PostgreSQL database with EF Core
- ✅ CSV file upload and parsing
- ✅ Category management (CRUD)
- ✅ Transaction categorization
- ✅ Spending reports and summaries
- ✅ RESTful API endpoints
- ✅ Modern C# 10 practices

The Blazor UI is ready to be developed with all the backend infrastructure in place!
