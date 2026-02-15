-- 001_InitialCreate.sql
-- Initial database schema creation for SpendTracker
-- This script is idempotent and can be safely re-run

-- Create Categories table
CREATE TABLE IF NOT EXISTS Categories (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Description TEXT,
    CreatedDate TEXT NOT NULL
);

-- Create unique index on Category Name
CREATE UNIQUE INDEX IF NOT EXISTS IX_Categories_Name 
    ON Categories(Name);

-- Create Transactions table
CREATE TABLE IF NOT EXISTS Transactions (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TransactionDate TEXT NOT NULL,
    Description TEXT NOT NULL,
    Debit REAL,
    Credit REAL,
    Balance REAL,
    CategoryId INTEGER,
    UploadBatchId TEXT NOT NULL,
    CreatedDate TEXT NOT NULL,
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id) ON DELETE SET NULL
);

-- Create indexes on Transactions table
CREATE INDEX IF NOT EXISTS IX_Transactions_TransactionDate 
    ON Transactions(TransactionDate);

CREATE INDEX IF NOT EXISTS IX_Transactions_CategoryId 
    ON Transactions(CategoryId);

CREATE INDEX IF NOT EXISTS IX_Transactions_UploadBatchId 
    ON Transactions(UploadBatchId);
