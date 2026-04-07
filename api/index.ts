import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import cors from "cors";

const app = express();
const DATA_FILE = path.join(process.cwd(), "data.json");

interface AppData {
  groqKeys: string[];
  authorizedKeys: string[];
}

function loadData(): AppData {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }
  // For Vercel/Serverless, we might want to use an environment variable or external DB
  // but for now we'll stick to the file-based approach as a fallback
  return { groqKeys: [], authorizedKeys: [] };
}

function saveData(data: AppData) {
  // Note: On Vercel, writing to the filesystem is ephemeral
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to save data to filesystem", e);
  }
}

app.use(cors());
app.use(express.json());

// API Routes
app.get("/api/config", (req, res) => {
  res.json(loadData());
});

app.post("/api/config", (req, res) => {
  const { groqKeys, authorizedKeys } = req.body;
  saveData({ groqKeys, authorizedKeys });
  res.json({ success: true });
});

app.post("/api/platform", async (req, res) => {
  const { prompt, model, unique_key } = req.body;
  const data = loadData();

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
  for (const apiKey of data.groqKeys) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: model || "mixtral-8x7b-32768",
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
      return res.json(response.data);
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;
      if (status === 400) {
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

  res.status(502).json({
    error: "All Groq API keys failed or exhausted",
    details: lastError?.response?.data || lastError?.message,
  });
});

export default app;
