# Spend Tracker Application

A .NET 10 application for tracking and categorizing banking transactions from CSV files.

## Architecture

- **SpendTracker.Core**: Domain entities and interfaces
- **SpendTracker.Infrastructure**: Data access layer with EF Core and PostgreSQL
- **SpendTracker.Api**: RESTful API built with ASP.NET Core
- **SpendTracker.Blazor**: Blazor Web App UI

## Technologies

- .NET 10
- PostgreSQL Database
- Entity Framework Core 10
- Blazor Web App (Auto rendering mode)
- CsvHelper for CSV parsing

## Database Setup

### Prerequisites
- PostgreSQL installed and running on localhost
- Default credentials: `postgres` / `postgres`

### Create Database
```sql
CREATE DATABASE spendtracker;
```

### Apply Migrations
From the solution root directory:
```bash
dotnet ef database update --project SpendTracker.Infrastructure --startup-project SpendTracker.Api
```

### Connection String
Update `appsettings.json` in SpendTracker.Api if your PostgreSQL credentials differ:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=spendtracker;Username=YOUR_USERNAME;Password=YOUR_PASSWORD"
  }
}
```

## Running the Application

### Start the API
```bash
cd SpendTracker.Api
dotnet run
```
API will be available at: `https://localhost:7XXX` (check console output)

### Start the Blazor UI
```bash
cd SpendTracker.Blazor
dotnet run
```
Blazor app will be available at: `https://localhost:5001`

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/{id}` - Get category by ID
- `POST /api/categories` - Create new category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category
- `GET /api/categories/{id}/transactions` - Get transactions for category
- `GET /api/categories/{id}/spending` - Get total spending for category
- `GET /api/categories/{id}/spending/monthly?year=2024` - Get monthly spending breakdown

### Transactions
- `GET /api/transactions` - Get all transactions (supports filtering by categoryId, startDate, endDate)
- `GET /api/transactions/{id}` - Get transaction by ID
- `POST /api/transactions/upload` - Upload CSV file
- `PUT /api/transactions/{id}/category` - Assign transaction to category
- `DELETE /api/transactions/{id}/category` - Remove category from transaction
- `DELETE /api/transactions/{id}` - Delete transaction
- `GET /api/transactions/summary/monthly?year=2024` - Get monthly spending summary

## CSV File Format

The application expects CSV files with the following columns:
```
Transaction Date,Posting Date,Description,Debits,Credits,Balance
2024-01-15,2024-01-16,Coffee Shop,-50.00,,2450.00
2024-01-16,2024-01-17,Salary Deposit,,5000.00,7450.00
```

**Note**: The `Posting Date` column is ignored during import.

## Features

- ✅ Upload CSV files with transaction data
- ✅ Create and manage spending categories
- ✅ Assign transactions to categories
- ✅ Track total spending per category
- ✅ View monthly spending breakdowns
- ✅ Filter transactions by date range or category
- ✅ Remove transactions from categories
- ✅ Delete transactions

## Development Notes

### Modern C# 10 Features Used
- Primary constructors for dependency injection
- File-scoped namespaces
- Record types for DTOs
- Required properties
- Nullable reference types
- Pattern matching

### Database Schema
- **categories**: id, name, description, created_date
- **transactions**: id, transaction_date, description, debit, credit, balance, category_id, upload_batch_id, created_date

## Next Steps

1. Ensure PostgreSQL is running
2. Create the `spendtracker` database
3. Run migrations to create tables
4. Start the API
5. Start the Blazor app
6. Upload a CSV file and start categorizing transactions!
