# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Create GCS Buckets
```bash
# Create the three required buckets
gsutil mb gs://your-uncategorized-bucket
gsutil mb gs://your-categories-bucket
gsutil mb gs://your-archive-bucket

# Set 30-day TTL on archive bucket
gsutil lifecycle set lifecycle.json gs://your-archive-bucket
```

### Step 2: Deploy Backend API
```bash
# Navigate to project directory
cd spend-tracker

# Create environment configuration
cat > .env.yaml << EOF
API_KEY: "my-secret-key-123"
UNCATEGORIZED_BUCKET_NAME: "your-uncategorized-bucket"
CATEGORIES_BUCKET_NAME: "your-categories-bucket"
ARCHIVE_BUCKET_NAME: "your-archive-bucket"
EOF

# Deploy to Google Cloud Functions
gcloud functions deploy transaction-api \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point helloHttp \
  --source ./src \
  --env-vars-file .env.yaml
```

### Step 3: Test Locally
```bash
# Open the web app locally
npx http-server .

# Then open http://localhost:8080 in your browser
```

### Step 4: Connect and Use
1. Open the web app
2. Enter your Cloud Function URL (shown after deployment)
3. Enter your API key (from .env.yaml)
4. Click "Connect"
5. Start categorizing transactions!

---

## 📝 Test with Sample Data

Create a test transaction:
```bash
curl -X POST "https://YOUR-FUNCTION-URL/write" \
  -H "Content-Type: application/json" \
  -H "x-api-key: my-secret-key-123" \
  -d '{
    "accountNumber": "123456",
    "dateTime": "2026-01-20T10:00:00.000Z",
    "centsAmount": 12500,
    "currencyCode": "zar",
    "type": "card",
    "merchant": {
      "name": "Woolworths",
      "country": {
        "code": "ZA",
        "name": "South Africa"
      }
    }
  }'
```

Now refresh the web app and categorize it!

---

## 🎯 Common Commands

**View bucket contents:**
```bash
gsutil ls gs://your-uncategorized-bucket/data/
gsutil ls gs://your-categories-bucket/
gsutil ls gs://your-archive-bucket/
```

**View Cloud Function logs:**
```bash
gcloud functions logs read transaction-api
```

**Update environment variables:**
```bash
gcloud functions deploy transaction-api \
  --update-env-vars API_KEY=new-key-here
```

**Delete everything (cleanup):**
```bash
gcloud functions delete transaction-api
gsutil -m rm -r gs://your-uncategorized-bucket
gsutil -m rm -r gs://your-categories-bucket
gsutil -m rm -r gs://your-archive-bucket
```

---

## 💡 Tips

- Default categories are created automatically on first API call
- Archive bucket auto-deletes files after 30 days
- Use bulk categorization for efficiency
- Check browser console for detailed error messages
- API key is only stored in browser memory (not persisted)

For detailed documentation, see [README.md](README.md)
