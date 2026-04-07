import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import axios from "axios";
import cors from "cors";

const DATA_FILE = path.join(process.cwd(), "data.json");

interface AppData {
  groqKeys: string[];
  authorizedKeys: string[];
}

function loadData(): AppData {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }
  return { groqKeys: [], authorizedKeys: [] };
}

function saveData(data: AppData) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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

    // 1. Validate Input
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: "Missing or invalid 'prompt' parameter" });
    }

    if (!unique_key) {
      return res.status(400).json({ error: "Missing 'unique_key' parameter" });
    }

    // 2. Validate Unique Key
    if (!data.authorizedKeys.includes(unique_key)) {
      return res.status(401).json({ error: "Unauthorized unique key" });
    }

    if (data.groqKeys.length === 0) {
      return res.status(500).json({ error: "No Groq API keys configured" });
    }

    // 2. Try Groq Keys with Rollover
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

        // 400 Bad Request: Payload issue (invalid model, empty prompt, etc.)
        // Rolling over won't help here, so return the error to the user immediately.
        if (status === 400) {
          return res.status(400).json({
            error: "Bad Request from Groq API",
            message: "The request payload is invalid. Check your prompt or model name.",
            details: error.response?.data || error.message
          });
        }

        // 401 Unauthorized: The specific Groq key is invalid or revoked.
        // 429 Too Many Requests: Rate limit hit for this key.
        // 5xx Server Error: Groq is having issues.
        // In these cases, rolling over to a new key is the correct action.
        if (status === 401 || status === 429 || (status >= 500 && status < 600)) {
          console.log(`Key failed with status ${status}. Rolling over to next available key...`);
          continue;
        }

        // For any other unexpected errors, log and attempt rollover
        console.log(`Unexpected error ${status || 'unknown'}: ${error.message}. Attempting rollover...`);
        continue;
      }
    }

    res.status(502).json({
      error: "All Groq API keys failed or exhausted",
      details: lastError?.response?.data || lastError?.message,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
