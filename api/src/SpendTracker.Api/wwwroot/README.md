# Transaction Categorization Tool

A simple web application for categorizing financial transactions from Google Cloud Storage.

## 🏗️ Architecture

### GCS Bucket Structure (3 Buckets)

1. **`uncategorized-bucket`** - Raw transactions from external systems
   - Files stored in: `data/*.json`
   - Source: `/write` endpoint

2. **`categories-bucket`** - Category definitions with statistics
   - Files: `{categoryId}.json`
   - Contains: id, name, color, totalCount, totalAmount

3. **`archive-bucket`** - Archived categorized transactions (30-day TTL)
   - Files: `*.json` with `userCategory` field added
   - Auto-deleted after 30 days via lifecycle policy

---

## 🚀 Setup Instructions

### Backend Setup (Google Cloud Function)

1. **Create the three GCS buckets:**
```bash
gsutil mb gs://uncategorized-bucket
gsutil mb gs://categories-bucket
gsutil mb gs://archive-bucket
```

2. **Set lifecycle policy on archive bucket (30-day TTL):**

Create `lifecycle.json`:
```json
{
  "lifecycle": {
    "rule": [{
      "action": {"type": "Delete"},
      "condition": {"age": 30}
    }]
  }
}
```

Apply it:
```bash
gsutil lifecycle set lifecycle.json gs://archive-bucket
```

3. **Deploy the Cloud Function:**

Create `.env.yaml`:
```yaml
API_KEY: "your-secret-api-key-here"
UNCATEGORIZED_BUCKET_NAME: "uncategorized-bucket"
CATEGORIES_BUCKET_NAME: "categories-bucket"
ARCHIVE_BUCKET_NAME: "archive-bucket"
```

Deploy:
```bash
gcloud functions deploy transaction-api \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point helloHttp \
  --source ./src \
  --env-vars-file .env.yaml
```

### Frontend Setup

1. **Update `app.js` if needed:**
   - The API URL will be entered by users at runtime
   - No hardcoding needed unless you want a default

2. **Deploy to hosting (choose one):**

   **Option A: Google Cloud Storage (Static Site)**
   ```bash
   gsutil mb gs://your-app-bucket
   gsutil -m cp index.html app.js styles.css gs://your-app-bucket/
   gsutil web set -m index.html gs://your-app-bucket
   gsutil iam ch allUsers:objectViewer gs://your-app-bucket
   ```

   **Option B: Local Testing**
   ```bash
   # Use a simple HTTP server
   npx http-server .
   # Then open http://localhost:8080
   ```

   **Option C: GitHub Pages**
   - Push the HTML, JS, and CSS files to GitHub
   - Enable GitHub Pages in repository settings

---

## 📡 API Endpoints

### Existing Endpoints

- **POST `/write`** - Write new transaction (external systems)
- **GET `/export`** - Get uncategorized transactions with pagination
  - Query params: `?limit=50&offset=0`

### Category Endpoints

- **GET `/categories`** - List all categories with stats
- **POST `/categories`** - Create new category
  - Body: `{ "id": "transport", "name": "Transport", "color": "#2196F3" }`
- **PUT `/categories/:id`** - Update category (name/color only)
  - Body: `{ "name": "New Name", "color": "#NEW123" }`
- **DELETE `/categories/:id`** - Delete category

### Categorization Endpoints

- **POST `/categorize`** - Categorize single transaction
  - Body: `{ "filename": "data/xxx.json", "category": "groceries" }`
  - Updates category stats automatically
  - Moves transaction to archive bucket
  
- **POST `/categorize-bulk`** - Categorize multiple transactions
  - Body: `[{ "filename": "data/xxx.json", "category": "groceries" }, ...]`

All endpoints require `x-api-key` header.

---

## 🎨 Using the Web App

### Initial Connection

1. Open the web app in your browser
2. Enter your API URL (e.g., `https://your-region-your-project.cloudfunctions.net/transaction-api`)
3. Enter your API Key
4. Click "Connect"

### Managing Categories

- View all categories with current statistics (count & total amount)
- Click "+ Add Category" to create a new category
- Click ✏️ to edit a category (name and color)
- Click 🗑️ to delete a category

### Categorizing Transactions

**Single Transaction:**
1. Select a category from the dropdown in the row
2. Click "Save"

**Bulk Categorization:**
1. Check the boxes next to transactions you want to categorize
2. Click "Categorize Selected (X)"
3. Choose a category in the modal
4. Click "Categorize"

### Features

- **Pagination**: Navigate through 50 transactions at a time
- **Real-time Stats**: Category stats update immediately after categorization
- **Currency Formatting**: Amounts displayed in ZAR (R format)
- **Graceful Degradation**: Handles missing merchant data

---

## 🗂️ Data Schema

### Transaction (Uncategorized)
```json
{
  "accountNumber": "",
  "dateTime": "2026-01-16T07:54:13.000Z",
  "centsAmount": 17500,
  "currencyCode": "zar",
  "type": "card",
  "reference": "",
  "card": {
    "id": "",
    "display": ""
  },
  "merchant": {
    "category": {
      "code": "0000",
      "key": "",
      "name": ""
    },
    "name": "Steam Purchase",
    "city": "",
    "country": {
      "code": "DE",
      "alpha3": "DEU",
      "name": "Germany"
    }
  }
}
```

### Category Definition
```json
{
  "id": "groceries",
  "name": "Groceries & Food",
  "color": "#4CAF50",
  "totalCount": 15,
  "totalAmount": 250000
}
```

### Archived Transaction
```json
{
  // ... all original transaction fields ...
  "userCategory": "groceries"
}
```

---

## 🔧 Default Categories

The system initializes with these categories on first run:

- Groceries & Food (#4CAF50)
- Entertainment (#9C27B0)
- Transport & Fuel (#2196F3)
- Utilities & Bills (#FF9800)
- Dining & Restaurants (#F44336)
- Shopping & Retail (#E91E63)
- Health & Medical (#00BCD4)
- Other (#9E9E9E)

---

## 🔐 Security Notes

- API key is entered by users and stored in browser memory only
- All endpoints require authentication via `x-api-key` header
- CORS is enabled for cross-origin requests
- Consider implementing rate limiting in production
- Use HTTPS for all API calls

---

## 📊 Future Enhancements

Potential features for future development:

- Export categorized data as CSV
- Date range filtering
- Advanced search/filtering
- Category-based reporting
- Auto-categorization based on merchant patterns
- Multi-user support with different API keys
- Undo categorization functionality
- Manual archive endpoint

---

## 🐛 Troubleshooting

### Connection Issues
- Verify API URL is correct (should include the full Cloud Function URL)
- Check API key matches the one configured in Cloud Function
- Ensure CORS is enabled in the API

### No Transactions Loading
- Check that the uncategorized bucket has files in the `data/` prefix
- Verify bucket permissions allow the service account to read

### Categories Not Showing
- The categories bucket should auto-initialize with default categories
- Check Cloud Function logs for initialization errors

---

## 📝 License

MIT License - feel free to modify and use as needed.
