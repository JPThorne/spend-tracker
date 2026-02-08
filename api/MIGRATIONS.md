# Database Migrations Guide

## Overview

This project uses **DbUp** with SQLite for database migrations instead of EF Core migrations. This approach provides:

- ✅ Full control over SQL scripts
- ✅ Re-runnable migration patterns
- ✅ Simple SQLite file-based database
- ✅ Version-controlled SQL scripts
- ✅ Automatic migration tracking

## Architecture

### Technology Stack
- **Database**: SQLite (file-based)
- **Migration Tool**: DbUp (dbup-sqlite)
- **ORM**: Entity Framework Core (for CRUD operations only)
- **Data Access**: Dapper (available for complex queries when needed)

### Key Components

1. **DatabaseUpgrader** (`SpendTracker.Infrastructure/Data/DatabaseUpgrader.cs`)
   - Handles running migrations on startup
   - Creates database if it doesn't exist
   - Tracks which scripts have been executed

2. **SQL Scripts** (`SpendTracker.Infrastructure/DatabaseMigrations/Scripts/`)
   - Embedded resources in the assembly
   - Executed in alphabetical order by name
   - Tracked in the `SchemaVersions` table

3. **DbContext** (`SpendTracker.Infrastructure/Data/SpendTrackerDbContext.cs`)
   - Used for EF Core CRUD operations
   - No longer generates migrations
   - Works with existing database schema

## Migration Execution

Migrations run automatically when the application starts (in `Program.cs`):

```csharp
var logger = app.Services.GetRequiredService<ILogger<Program>>();
DatabaseUpgrader.UpgradeDatabase(connectionString, logger);
```

## Creating New Migrations

### Step 1: Create a New SQL Script

Create a new `.sql` file in `SpendTracker.Infrastructure/DatabaseMigrations/Scripts/` following the naming convention:

```
###_DescriptiveName.sql
```

**Example**: `002_AddPaymentMethodColumn.sql`

### Step 2: Write Re-Runnable SQL

Always use idempotent patterns (safe to re-run):

#### Creating Tables
```sql
CREATE TABLE IF NOT EXISTS TableName (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Column1 TEXT NOT NULL,
    Column2 REAL
);
```

#### Adding Columns
```sql
-- Option 1: Check if column exists (SQLite doesn't have ADD COLUMN IF NOT EXISTS)
-- For SQLite, you may need to check the schema first or handle errors gracefully

-- Option 2: Create a new table with the column and migrate data if needed
-- This is more complex but ensures idempotency
```

#### Creating Indexes
```sql
CREATE INDEX IF NOT EXISTS IX_TableName_ColumnName 
    ON TableName(ColumnName);
```

#### Creating Unique Constraints
```sql
CREATE UNIQUE INDEX IF NOT EXISTS IX_TableName_UniqueColumn 
    ON TableName(UniqueColumn);
```

### Step 3: Build and Run

The `.csproj` file automatically includes `*.sql` files as embedded resources:

```xml
<ItemGroup>
  <EmbeddedResource Include="DatabaseMigrations\Scripts\*.sql" />
</ItemGroup>
```

1. Build the project: `dotnet build`
2. Run the application: `dotnet run --project SpendTracker.Api`
3. DbUp will automatically detect and run new scripts

### Step 4: Verify

Check the logs on startup:
```
info: Program[0]
      Starting database migration...
info: Program[0]
      Executed migration script: SpendTracker.Infrastructure.DatabaseMigrations.Scripts.002_AddPaymentMethodColumn.sql
```

## SQLite Data Types

SQLite uses a simplified type system:

| SQL Type | SQLite Type | .NET Type |
|----------|-------------|-----------|
| INTEGER | INTEGER | int, long |
| REAL | REAL | double, float, decimal |
| TEXT | TEXT | string, DateTime, Guid |
| BLOB | BLOB | byte[] |

**Notes**:
- SQLite stores DateTime as TEXT in ISO 8601 format
- Decimals are stored as REAL (floating point)
- AUTOINCREMENT creates auto-incrementing primary keys

## Connection String

The default connection string is in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=spendtracker.db"
  }
}
```

The database file will be created in the application's working directory.

## Migration Tracking

DbUp creates a `SchemaVersions` table to track executed scripts:

```sql
SELECT * FROM SchemaVersions;
```

This prevents scripts from running multiple times.

## Current Schema

### Tables

**Categories**
- `Id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `Name` - TEXT NOT NULL (UNIQUE)
- `Description` - TEXT
- `CreatedDate` - TEXT NOT NULL

**Transactions**
- `Id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `TransactionDate` - TEXT NOT NULL
- `Description` - TEXT NOT NULL
- `Debit` - REAL
- `Credit` - REAL
- `Balance` - REAL
- `CategoryId` - INTEGER (Foreign Key to Categories)
- `UploadBatchId` - TEXT NOT NULL
- `CreatedDate` - TEXT NOT NULL

### Indexes
- `IX_Categories_Name` - Unique index on Categories.Name
- `IX_Transactions_TransactionDate` - Index on Transactions.TransactionDate
- `IX_Transactions_CategoryId` - Index on Transactions.CategoryId
- `IX_Transactions_UploadBatchId` - Index on Transactions.UploadBatchId

## Best Practices

1. **Always use IF NOT EXISTS** - Makes scripts re-runnable
2. **Use descriptive names** - `002_AddUserTable.sql` not `migration2.sql`
3. **One logical change per script** - Easier to track and rollback
4. **Test locally first** - Run migrations on development database
5. **Never modify executed scripts** - Create a new script to fix issues
6. **Include comments** - Explain why changes are being made

## Troubleshooting

### Database locked error
- Close any SQLite browser tools that have the database open
- Ensure only one application instance is accessing the database

### Script not running
- Verify the file is in the correct directory
- Check the naming convention (###_Name.sql)
- Ensure the file is set as an embedded resource
- Rebuild the project

### Migration failed
- Check the error logs
- DbUp will not mark failed scripts as executed
- Fix the script and restart the application

## Rolling Back Migrations

DbUp doesn't have built-in rollback support. To roll back:

1. **Delete the database file** (development only)
2. **Restore from backup** (production)
3. **Create a new migration** to undo changes (preferred)

Example rollback script:
```sql
-- 003_RemovePaymentMethodColumn.sql
DROP INDEX IF EXISTS IX_Transactions_PaymentMethod;
-- SQLite doesn't support DROP COLUMN easily
-- May need to recreate table without the column
```

## Additional Resources

- [DbUp Documentation](https://dbup.readthedocs.io/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [EF Core with SQLite](https://learn.microsoft.com/en-us/ef/core/providers/sqlite/)
