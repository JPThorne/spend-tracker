# Spend Tracker Web App - Setup Guide

A simple web application for categorizing financial transactions using the SpendTracker .NET API.

## 🚀 Quick Start

### Prerequisites
- Node.js installed (for running the development server)
- The SpendTracker API running (see `/api` folder)

### Step 1: Start the API

In the `/api` folder:
```bash
cd api/SpendTracker.Api
dotnet run
```

The API will start on `http://localhost:5062` (default)

### Step 2: Start the Web App

In the `/web` folder:
```bash
npx http-server -p 8080
```

The web app will be available at `http://localhost:8080`

### Step 3: Connect to the API

1. Open `http://localhost:8080` in your browser
2. Enter the API URL: `http://localhost:5062/api`
3. Enter the API Key: `b8f4e7a9-2c3d-4f5a-9e8b-1d2c3e4f5a6b`
4. Click "Connect"

## 📋 Features

### CSV Upload
- Upload bank transaction CSV files
- Automatically imports transactions into the database
- View upload results with success/error counts

### Category Management
- Create new categories
- Edit existing categories (name and description)
- Delete categories (only if no transactions assigned)
- View real-time statistics (transaction count and total spending)

### Transaction Categorization

**Single Transaction:**
1. Select a category from the dropdown
2. Click "Save"

**Bulk Categorization:**
1. Check the boxes next to transactions
2. Click "Categorize Selected"
3. Choose a category
4. Click "Categorize"

## 🗂️ API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/categories` | GET | List all categories |
| `/categories` | POST | Create category |
| `/categories/{id}` | PUT | Update category |
| `/categories/{id}` | DELETE | Delete category |
| `/transactions?uncategorized=true` | GET | Get uncategorized transactions |
| `/transactions/{id}/category` | PUT | Categorize single transaction |
| `/transactions/bulk-categorize` | POST | Categorize multiple transactions |
| `/transactions/upload` | POST | Upload CSV file |

## 🔐 API Key

The API key is configured in `api/SpendTracker.Api/appsettings.json`:

```json
{
  "ApiKey": "b8f4e7a9-2c3d-4f5a-9e8b-1d2c3e4f5a6b"
}
```

**Note:** This is a development key. Change it for production use!

## 📊 Data Format

### CSV Upload Format
The API expects CSV files with these columns:
- Transaction Date
- Description
- Debit (optional)
- Credit (optional)
- Balance (optional)

See `api/sample-transactions.csv` for an example.

### Category Structure
```json
{
  "id": 1,
  "name": "Groceries",
  "description": "Food and household items",
  "transactionCount": 15,
  "totalSpending": 2500.50
}
```

### Transaction Structure
```json
{
  "id": 1,
  "transactionDate": "2026-02-01T00:00:00Z",
  "description": "Store Purchase",
  "debit": 125.50,
  "credit": null,
  "balance": 1000.00,
  "categoryId": 1,
  "categoryName": "Groceries"
}
```

## 🎨 Technology Stack

- **Frontend**: Vanilla JavaScript (no frameworks)
- **Styling**: Pure CSS with gradients
- **API**: .NET 10 REST API
- **Database**: SQLite with DbUp migrations

## 🔧 Configuration

### Change API URL
Edit the default URL in `app.js`:
```javascript
let API_URL = 'http://localhost:5062/api'; // Change this
```

### Change API Key
Update in both:
1. `api/SpendTracker.Api/appsettings.json`
2. Enter the new key in the web UI

## 🐛 Troubleshooting

### Connection Failed
- **Issue**: "Authentication failed. Please check your API key."
- **Solution**: Ensure the API key matches the one in `appsettings.json`

### CORS Errors
- **Issue**: Browser console shows CORS errors
- **Solution**: The API is configured to allow all origins. Ensure the API is running.

### No Transactions Loading
- **Issue**: Transaction list is empty
- **Solution**: 
  - Upload a CSV file first
  - Check that transactions exist in the database
  - Ensure they're uncategorized (CategoryId is null)

### API Not Responding
- **Issue**: Connection timeout
- **Solution**:
  - Verify API is running: `dotnet run --project api/SpendTracker.Api`
  - Check the API URL is correct (include `/api` at the end)
  - Check firewall settings

## 📝 Development Notes

### Adding New Features
The code is organized into sections:
- **API Client**: `apiRequest()` function handles all API calls
- **Rendering**: `renderCategories()`, `renderTransactions()`
- **Event Handlers**: Bottom of `app.js`
- **Styles**: Organized by component in `styles.css`

### Customization
- **Colors**: Edit gradient in `styles.css` (search for `#667eea` and `#764ba2`)
- **Currency**: Change `formatCurrency()` in `app.js`
- **Date Format**: Change `formatDate()` in `app.js`

## 🚀 Deployment

### Production Deployment

1. **Update API Key**: Generate a strong, random key
2. **Update CORS**: In `api/SpendTracker.Api/Program.cs`, change from `AllowAnyOrigin()` to specific domain
3. **Deploy API**: Host on Azure, AWS, or any .NET hosting service
4. **Deploy Web App**: 
   - GitHub Pages
   - Netlify
   - Vercel
   - Any static hosting service

### Environment Variables (Production)
Store the API key securely:
- Azure: Application Settings
- AWS: Parameter Store
- Environment Variables on your hosting platform

## 📚 Additional Resources

- [.NET API Documentation](../api/README.md)
- [Database Migrations Guide](../api/MIGRATIONS.md)
- [Sample CSV File](../api/sample-transactions.csv)

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API logs in the console where `dotnet run` is executing
3. Check browser console for JavaScript errors

---

**Version**: 1.0.0  
**Last Updated**: February 2026
