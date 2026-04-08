import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import cors from "cors";
import { connectToDatabase, Config, RequestLog } from "./_db.js";

const app = express();
const DATA_FILE = path.join(process.cwd(), "data.json");

interface AppData {
  groqKeys: string[];
  authorizedKeys: string[];
}

async function loadData(): Promise<AppData> {
  await connectToDatabase();
  const config = await Config.findOne({ id: 'main_config' });
  if (config) {
    return {
      groqKeys: config.groqKeys || [],
      authorizedKeys: config.authorizedKeys || []
    };
  }
  
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }
  return { groqKeys: [], authorizedKeys: [] };
}

async function saveData(data: AppData) {
  await connectToDatabase();
  await Config.findOneAndUpdate(
    { id: 'main_config' },
    { ...data },
    { upsert: true, new: true }
  );
  
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to save data to filesystem", e);
  }
}

app.use(cors());
app.use(express.json());

// API Routes
app.get("/api/config", async (req, res) => {
  res.json(await loadData());
});

app.get("/api/stats", async (req, res) => {
  await connectToDatabase();
  const stats = await RequestLog.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);
  
  const recentLogs = await RequestLog.find().sort({ timestamp: -1 }).limit(50);
  
  res.json({ stats, recentLogs });
});

app.post("/api/config", async (req, res) => {
  const { groqKeys, authorizedKeys } = req.body;
  await saveData({ groqKeys, authorizedKeys });
  res.json({ success: true });
});

app.post("/api/platform", async (req, res) => {
  const { prompt, model, unique_key } = req.body;
  const data = await loadData();

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: "Missing or invalid 'prompt' parameter" });
  }

  if (!unique_key) {
    return res.status(400).json({ error: "Missing 'unique_key' parameter" });
  }

  if (!data.authorizedKeys.includes(unique_key)) {
    return res.status(401).json({ error: "Unauthorized unique key" });
  }

  if (data.groqKeys.length === 0) {
    return res.status(500).json({ error: "No Groq API keys configured" });
  }

  let lastError = null;
  let attempts = 0;
  for (const apiKey of data.groqKeys) {
    attempts++;
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: model || "qwen/qwen3-32b",
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      // Log Success
      await RequestLog.create({
        uniqueKey: unique_key,
        aiModel: model || "qwen/qwen3-32b",
        status: attempts > 1 ? 'fallback' : 'success',
        attempts
      });

      return res.json(response.data);
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;
      if (status === 400) {
        await RequestLog.create({
          uniqueKey: unique_key,
          aiModel: model || "qwen/qwen3-32b",
          status: 'error',
          errorCode: 400,
          errorMessage: "Bad Request",
          attempts
        });
        return res.status(400).json({
          error: "Bad Request from Groq API",
          message: "The request payload is invalid. Check your prompt or model name.",
          details: error.response?.data || error.message
        });
      }
      if (status === 401 || status === 429 || (status >= 500 && status < 600)) {
        continue;
      }
      continue;
    }
  }

  // Log Final Failure
  await RequestLog.create({
    uniqueKey: unique_key,
    aiModel: model || "qwen/qwen3-32b",
    status: 'error',
    errorCode: lastError?.response?.status || 502,
    errorMessage: "All keys failed",
    attempts
  });

  res.status(502).json({
    error: "All Groq API keys failed or exhausted",
    details: lastError?.response?.data || lastError?.message,
  });
});

export default app;
