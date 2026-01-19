import { Storage } from "@google-cloud/storage";

const apiKey = process.env.API_KEY;
const bucketName = process.env.BUCKET_NAME;

if (!apiKey || !bucketName) {
  throw new Error("Missing required environment variables");
}

const storage = new Storage();
const bucket = storage.bucket(bucketName);

export async function helloHttp(req, res) {
  try {
    // Simple routing
    if (req.path === "/write") {
      return handleWrite(req, res);
    }
    if (req.path === "/export") {
      return handleExport(req, res);
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

  await bucket.file(filename).save(JSON.stringify(req.body), {
    contentType: "application/json"
  });

  res.json({ ok: true });
}

async function handleExport(req, res) {
  console.log(bucketName);
  if (!(await authenticate(req, res))) return;
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const [files] = await bucket.getFiles({ prefix: "data/" });
  console.log(files.length);
  const results = [];
  for (const file of files) {
    console.log(file.name);
    const [contents] = await file.download();
    results.push({
      name: file.name,
      data: JSON.parse(contents.toString("utf8"))
    });
  }

  res.json({ items: results });
}
