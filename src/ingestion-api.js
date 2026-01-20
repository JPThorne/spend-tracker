import { Storage } from "@google-cloud/storage";

const apiKey = process.env.API_KEY;
const uncategorizedBucketName = process.env.UNCATEGORIZED_BUCKET_NAME || process.env.BUCKET_NAME;
const categoriesBucketName = process.env.CATEGORIES_BUCKET_NAME;
const archiveBucketName = process.env.ARCHIVE_BUCKET_NAME;

if (!apiKey || !uncategorizedBucketName || !categoriesBucketName || !archiveBucketName) {
  throw new Error("Missing required environment variables");
}

const storage = new Storage();
const uncategorizedBucket = storage.bucket(uncategorizedBucketName);
const categoriesBucket = storage.bucket(categoriesBucketName);
const archiveBucket = storage.bucket(archiveBucketName);

// Default categories to initialize
const DEFAULT_CATEGORIES = [
  { id: "groceries", name: "Groceries & Food", color: "#4CAF50", totalCount: 0, totalAmount: 0 },
  { id: "entertainment", name: "Entertainment", color: "#9C27B0", totalCount: 0, totalAmount: 0 },
  { id: "transport", name: "Transport & Fuel", color: "#2196F3", totalCount: 0, totalAmount: 0 },
  { id: "utilities", name: "Utilities & Bills", color: "#FF9800", totalCount: 0, totalAmount: 0 },
  { id: "dining", name: "Dining & Restaurants", color: "#F44336", totalCount: 0, totalAmount: 0 },
  { id: "shopping", name: "Shopping & Retail", color: "#E91E63", totalCount: 0, totalAmount: 0 },
  { id: "health", name: "Health & Medical", color: "#00BCD4", totalCount: 0, totalAmount: 0 },
  { id: "other", name: "Other", color: "#9E9E9E", totalCount: 0, totalAmount: 0 }
];

// Initialize default categories if they don't exist
async function initializeCategories() {
  try {
    const [files] = await categoriesBucket.getFiles();
    if (files.length === 0) {
      console.log("Initializing default categories...");
      for (const category of DEFAULT_CATEGORIES) {
        await categoriesBucket.file(`${category.id}.json`).save(
          JSON.stringify(category),
          { contentType: "application/json" }
        );
      }
      console.log("Default categories initialized.");
    }
  } catch (err) {
    console.error("Error initializing categories:", err);
  }
}

// Initialize categories on startup
initializeCategories();

export async function helloHttp(req, res) {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Simple routing
    if (req.path === "/write") {
      return handleWrite(req, res);
    }
    if (req.path === "/export") {
      return handleExport(req, res);
    }
    if (req.path === "/categories") {
      if (req.method === "GET") return handleGetCategories(req, res);
      if (req.method === "POST") return handleCreateCategory(req, res);
    }
    if (req.path.startsWith("/categories/")) {
      const categoryId = req.path.split("/categories/")[1];
      if (req.method === "PUT") return handleUpdateCategory(req, res, categoryId);
      if (req.method === "DELETE") return handleDeleteCategory(req, res, categoryId);
    }
    if (req.path === "/categorize") {
      return handleCategorize(req, res);
    }
    if (req.path === "/categorize-bulk") {
      return handleCategorizeBulk(req, res);
    }

    res.status(404).send("Not found");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal error");
  }
}

async function authenticate(req, res) {
  if (req.headers["x-api-key"] !== apiKey) {
    res.status(401).send("Unauthorized");
    return false;
  }
  return true;
}

async function handleWrite(req, res) {
  if (!(await authenticate(req, res))) return;
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const filename = `data/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.json`;
  
  console.log(filename);

  await uncategorizedBucket.file(filename).save(JSON.stringify(req.body), {
    contentType: "application/json"
  });

  res.json({ ok: true });
}

async function handleExport(req, res) {
  if (!(await authenticate(req, res))) return;
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // Parse pagination parameters
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const [files] = await uncategorizedBucket.getFiles({ prefix: "data/" });
  const total = files.length;
  
  // Apply pagination
  const paginatedFiles = files.slice(offset, offset + limit);
  
  const results = [];
  for (const file of paginatedFiles) {
    try {
      const [contents] = await file.download();
      results.push({
        filename: file.name,
        data: JSON.parse(contents.toString("utf8"))
      });
    } catch (err) {
      console.error(`Error reading file ${file.name}:`, err);
    }
  }

  res.json({ 
    items: results,
    total: total,
    limit: limit,
    offset: offset
  });
}

async function handleGetCategories(req, res) {
  if (!(await authenticate(req, res))) return;

  try {
    const [files] = await categoriesBucket.getFiles();
    const categories = [];
    
    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const [contents] = await file.download();
        categories.push(JSON.parse(contents.toString("utf8")));
      }
    }

    res.json({ categories });
  } catch (err) {
    console.error("Error getting categories:", err);
    res.status(500).json({ error: "Failed to get categories" });
  }
}

async function handleCreateCategory(req, res) {
  if (!(await authenticate(req, res))) return;
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const { id, name, color } = req.body;
  
  if (!id || !name || !color) {
    res.status(400).json({ error: "Missing required fields: id, name, color" });
    return;
  }

  const category = {
    id,
    name,
    color,
    totalCount: 0,
    totalAmount: 0
  };

  try {
    await categoriesBucket.file(`${id}.json`).save(
      JSON.stringify(category),
      { contentType: "application/json" }
    );

    res.json({ ok: true, category });
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
}

async function handleUpdateCategory(req, res, categoryId) {
  if (!(await authenticate(req, res))) return;

  const { name, color } = req.body;

  try {
    const file = categoriesBucket.file(`${categoryId}.json`);
    const [exists] = await file.exists();
    
    if (!exists) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const [contents] = await file.download();
    const category = JSON.parse(contents.toString("utf8"));

    // Update only name and color, preserve stats
    if (name) category.name = name;
    if (color) category.color = color;

    await file.save(JSON.stringify(category), {
      contentType: "application/json"
    });

    res.json({ ok: true, category });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
}

async function handleDeleteCategory(req, res, categoryId) {
  if (!(await authenticate(req, res))) return;

  try {
    const file = categoriesBucket.file(`${categoryId}.json`);
    const [exists] = await file.exists();
    
    if (!exists) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    await file.delete();
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
}

async function handleCategorize(req, res) {
  if (!(await authenticate(req, res))) return;
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const { filename, category: categoryId } = req.body;

  if (!filename || !categoryId) {
    res.status(400).json({ error: "Missing required fields: filename, category" });
    return;
  }

  try {
    // 1. Read transaction from uncategorized bucket
    const transactionFile = uncategorizedBucket.file(filename);
    const [transactionExists] = await transactionFile.exists();
    
    if (!transactionExists) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const [transactionContents] = await transactionFile.download();
    const transaction = JSON.parse(transactionContents.toString("utf8"));

    // 2. Read and update category stats
    const categoryFile = categoriesBucket.file(`${categoryId}.json`);
    const [categoryExists] = await categoryFile.exists();
    
    if (!categoryExists) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const [categoryContents] = await categoryFile.download();
    const category = JSON.parse(categoryContents.toString("utf8"));

    // 3. Update category stats
    category.totalCount++;
    category.totalAmount += transaction.centsAmount || 0;

    await categoryFile.save(JSON.stringify(category), {
      contentType: "application/json"
    });

    // 4. Add category to transaction and save to archive
    transaction.userCategory = categoryId;
    const archiveFilename = filename.replace('data/', '');
    await archiveBucket.file(archiveFilename).save(
      JSON.stringify(transaction),
      { contentType: "application/json" }
    );

    // 5. Delete from uncategorized bucket
    await transactionFile.delete();

    res.json({ ok: true, category });
  } catch (err) {
    console.error("Error categorizing transaction:", err);
    res.status(500).json({ error: "Failed to categorize transaction" });
  }
}

async function handleCategorizeBulk(req, res) {
  if (!(await authenticate(req, res))) return;
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const items = req.body;

  if (!Array.isArray(items)) {
    res.status(400).json({ error: "Body must be an array of categorization items" });
    return;
  }

  const updatedCategories = {};
  let processed = 0;

  try {
    for (const item of items) {
      const { filename, category: categoryId } = item;

      if (!filename || !categoryId) {
        continue;
      }

      try {
        // 1. Read transaction
        const transactionFile = uncategorizedBucket.file(filename);
        const [transactionExists] = await transactionFile.exists();
        
        if (!transactionExists) continue;

        const [transactionContents] = await transactionFile.download();
        const transaction = JSON.parse(transactionContents.toString("utf8"));

        // 2. Read category (use cache if already loaded)
        let category;
        if (updatedCategories[categoryId]) {
          category = updatedCategories[categoryId];
        } else {
          const categoryFile = categoriesBucket.file(`${categoryId}.json`);
          const [categoryExists] = await categoryFile.exists();
          
          if (!categoryExists) continue;

          const [categoryContents] = await categoryFile.download();
          category = JSON.parse(categoryContents.toString("utf8"));
        }

        // 3. Update category stats
        category.totalCount++;
        category.totalAmount += transaction.centsAmount || 0;
        updatedCategories[categoryId] = category;

        // 4. Archive transaction
        transaction.userCategory = categoryId;
        const archiveFilename = filename.replace('data/', '');
        await archiveBucket.file(archiveFilename).save(
          JSON.stringify(transaction),
          { contentType: "application/json" }
        );

        // 5. Delete from uncategorized
        await transactionFile.delete();

        processed++;
      } catch (err) {
        console.error(`Error processing ${filename}:`, err);
      }
    }

    // Save all updated categories
    for (const [categoryId, category] of Object.entries(updatedCategories)) {
      await categoriesBucket.file(`${categoryId}.json`).save(
        JSON.stringify(category),
        { contentType: "application/json" }
      );
    }

    res.json({ 
      ok: true, 
      processed,
      categories: Object.values(updatedCategories)
    });
  } catch (err) {
    console.error("Error in bulk categorization:", err);
    res.status(500).json({ error: "Failed to categorize transactions" });
  }
}
