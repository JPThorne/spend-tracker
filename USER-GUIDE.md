# SpendTracker - User Guide

Welcome to SpendTracker! This guide will help you get started with managing and categorizing your financial transactions.

## Table of Contents
- [Getting Started](#getting-started)
- [Uploading Transactions](#uploading-transactions)
- [Managing Categories](#managing-categories)
- [Categorizing Transactions](#categorizing-transactions)
- [Viewing Reports](#viewing-reports)
- [Tips & Best Practices](#tips--best-practices)

## Getting Started

### Installation

1. Download `SpendTracker.exe`
2. Create a folder (e.g., `C:\SpendTracker`)
3. Move the executable to that folder
4. Double-click `SpendTracker.exe` to launch

### First Launch

When you launch SpendTracker:
- A console window appears (this is the server - keep it running!)
- Your web browser automatically opens to the application
- You're ready to start!

**Note:** If the browser doesn't open automatically, navigate to `http://localhost:5000`

### Closing the Application

- Close the browser tab when done
- Press `Ctrl+C` in the console window, or close the window to stop the server

## Uploading Transactions

### Preparing Your CSV File

SpendTracker accepts CSV files with these columns:
```
Transaction Date,Posting Date,Description,Debits,Credits,Balance
```

Example:
```csv
Transaction Date,Posting Date,Description,Debits,Credits,Balance
2024-01-15,2024-01-16,Coffee Shop,-50.00,,2450.00
2024-01-16,2024-01-17,Salary Deposit,,5000.00,7450.00
```

**Important:**
- Debits should be negative amounts (expenses)
- Credits should be positive amounts (income)
- The Posting Date column is optional and will be ignored

### Uploading

1. Click **"Categorize Transactions"** tab
2. In the **Upload Transactions** section
3. Click **"Choose File"** and select your CSV
4. Click **"Upload CSV"**

The application will:
- Import all valid transactions
- Skip duplicates (based on date, description, and amount)
- Show you a summary of what was imported

## Managing Categories

### Viewing Categories

Your categories are displayed in the **Categories** section showing:
- Category name
- Number of transactions
- Total spending

### Adding a Category

1. Click **"+ Add Category"**
2. Enter a name (e.g., "Groceries & Food")
3. Optionally add a description
4. Click **"Save"**

### Editing a Category

1. Click the **✏️ (edit)** icon next to a category
2. Update the name or description
3. Click **"Save"**

### Deleting a Category

1. Click the **🗑️ (delete)** icon next to a category
2. Confirm deletion
3. **Note:** This will un-categorize all transactions in that category

### Default Categories

SpendTracker comes with suggested categories:
- Groceries & Food
- Entertainment
- Transport & Fuel
- Utilities & Bills
- Dining & Restaurants
- Shopping & Retail
- Health & Medical
- Other

You can modify or delete these as needed!

## Categorizing Transactions

### Single Transaction

1. Find the transaction in the **Uncategorized Transactions** table
2. Select a category from the dropdown
3. Click **"Save"**

### Bulk Categorization

To categorize multiple transactions at once:

1. Check the boxes next to transactions you want to categorize
2. Click **"Categorize Selected (X)"**
3. Choose a category in the popup
4. Click **"Categorize"**

**Tip:** Use the checkbox in the header to select/deselect all transactions

### Un-categorizing

If you made a mistake:

1. Go to the **"View Categories"** tab
2. Expand the category
3. Find the transaction
4. Click **"Remove"** to un-categorize it

## Viewing Reports

### Category View

Click the **"View Categories"** tab to see:
- All categories sorted by spending (highest first)
- Total spending per category
- Transaction count per category

### Date Filtering

Filter your view by date range:

**Preset Ranges:**
- This Month
- Last Month
- Last 3 Months
- This Quarter / Last Quarter
- This Year / Last Year
- All Time

**Custom Range:**
1. Select "Custom Range" from dropdown
2. Choose start and end dates
3. Click **"Apply"**

### Comparing Periods

The date range display shows:
- Selected period
- Total spending
- Comparison to previous period (↑/↓ percentage)

### Viewing Category Details

1. Click on any category to expand it
2. See all transactions in that category
3. View dates, descriptions, and amounts
4. Options to re-assign or remove transactions

## Tips & Best Practices

### Regular Imports

- Download your bank statements monthly
- Import them into SpendTracker right away
- Categorize as you go for better tracking

### Category Organization

- Keep categories broad initially
- Create specific categories for major expenses
- Use consistent naming

### Backup Your Data

Your data is stored in `spendtracker.db` next to the application.

**Backup regularly:**
1. Close SpendTracker
2. Copy `spendtracker.db` to a safe location
3. Store backups with dates (e.g., `spendtracker_2024-01-15.db`)

### Transaction Management

**Finding Transactions:**
- Use your browser's Find feature (Ctrl+F) to search descriptions
- Sort by date or amount using the table headers

**Handling Duplicates:**
- SpendTracker automatically skips duplicate transactions
- Check the upload summary for skipped duplicates

**Deleting Transactions:**
- Click the 🗑️ icon next to any transaction to delete it
- Use this for test data or incorrect entries

### Batch Operations

**Delete Upload Batch:**
If you uploaded a file by mistake:
1. After upload, note the Batch ID in the result
2. Click "Delete This Upload"
3. All transactions from that batch are removed

### Reviewing Spending

1. Switch to **"View Categories"** tab
2. Select **"This Month"** to see current spending
3. Compare with last month using the percentage indicator
4. Expand categories to see individual transactions
5. Identify areas to reduce spending

### Keyboard Shortcuts

- `Ctrl+F` - Search in browser
- `Ctrl+C` - Stop the server (in console window)
- `Ctrl+Click` - Open link in new tab

## Troubleshooting

### Browser Won't Open
- Manually navigate to `http://localhost:5000`

### "Connection Failed" Error
- Ensure the console window is still running
- Check that no firewall is blocking the application

### Lost Data
- Restore from your latest `spendtracker.db` backup
- If no backup, the database file may be in your application folder

### Duplicate Transactions Imported
- SpendTracker should catch these automatically
- If you see duplicates, delete them manually using the 🗑️ icon

### Categories Not Saving
- Ensure the console window shows no errors
- Try refreshing the browser page
- Check that `spendtracker.db` is not read-only

## Data Privacy

✅ **Your data stays private:**
- All data is stored locally on your computer
- No internet connection required
- No data is sent to external servers
- Database file is in the application folder

## Getting Help

If you encounter issues:
1. Check the console window for error messages
2. Try restarting the application
3. Review this guide
4. Check DEPLOYMENT.md for troubleshooting steps

---

**Happy tracking! 💰**
