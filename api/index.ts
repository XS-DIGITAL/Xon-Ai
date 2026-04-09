import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import cors from "cors";
import { connectToDatabase, Config, RequestLog, UserKey, Payment } from "./_db.js";

const generateUniqueKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 13; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `xon_${result}`;
};

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
app.get("/api/pay/config", async (req, res) => {
  await connectToDatabase();
  let config = await Config.findOne({ id: 'main_config' });
  if (!config) {
    config = await Config.create({ id: 'main_config' });
  }

  if (process.env.FLW_SECRET_KEY && !config.flwPlanId) {
    try {
      const plansRes = await axios.get('https://api.flutterwave.com/v3/payment-plans', {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
      });
      const existingPlan = plansRes.data.data?.find((p: any) => p.name === "Xon AI Monthly Subscription");
      
      if (existingPlan) {
        config.flwPlanId = existingPlan.id.toString();
        await config.save();
      } else {
        const createPlanRes = await axios.post('https://api.flutterwave.com/v3/payment-plans', {
          amount: 2,
          name: "Xon AI Monthly Subscription",
          interval: "monthly",
          currency: "USD"
        }, {
          headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
        });
        config.flwPlanId = createPlanRes.data.data.id.toString();
        await config.save();
      }
    } catch (err) {
      console.error("Failed to ensure FLW plan:", err);
    }
  }

  res.json({
    publicKey: process.env.FLW_PUBLIC_KEY || process.env.VITE_FLW_PUBLIC_KEY,
    planId: config.flwPlanId
  });
});

app.get("/api/config", async (req, res) => {
  res.json(await loadData());
});

app.get("/api/stats", async (req, res) => {
  await connectToDatabase();
  
  // API Stats
  const apiStats = await RequestLog.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Payment Stats
  const paymentStats = await Payment.aggregate([
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]);

  const totalEarnings = await Payment.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" }
      }
    }
  ]);

  const recentLogs = await RequestLog.find().sort({ timestamp: -1 }).limit(50);
  const recentPayments = await Payment.find().sort({ timestamp: -1 }).limit(20);
  
  res.json({ 
    stats: apiStats, 
    recentLogs,
    paymentStats,
    totalEarnings: totalEarnings[0]?.total || 0,
    recentPayments
  });
});

app.post("/api/config", async (req, res) => {
  const { groqKeys, authorizedKeys } = req.body;
  await saveData({ groqKeys, authorizedKeys });
  res.json({ success: true });
});

// Flutterwave & Key Management
app.post("/api/pay/verify", async (req, res) => {
  const { transaction_id, email, type } = req.body;
  
  if (!transaction_id || !email || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`
        }
      }
    );

    if (response.data.status === "success" && response.data.data.status === "successful") {
      await connectToDatabase();
      
      const key = generateUniqueKey();
      const nextPaymentDate = type === 'subscription' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
        : undefined;

      await UserKey.create({
        key,
        email,
        type,
        status: 'active',
        flutterwaveRef: transaction_id,
        nextPaymentDate
      });

      // Record Payment
      await Payment.create({
        email,
        amount: response.data.data.amount,
        currency: response.data.data.currency,
        type,
        flutterwaveRef: transaction_id,
        status: 'successful'
      });

      const config = await Config.findOne({ id: 'main_config' });
      if (config) {
        config.authorizedKeys = [...(config.authorizedKeys || []), key];
        await config.save();
      }

      res.json({ success: true, key });
    } else {
      res.status(400).json({ error: "Payment verification failed" });
    }
  } catch (error: any) {
    console.error("FLW Verify Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Internal server error during verification" });
  }
});

app.post("/api/pay/webhook", async (req, res) => {
  const signature = req.headers["verif-hash"];
  if (!signature || signature !== process.env.FLW_WEBHOOK_HASH) {
    return res.status(401).end();
  }

  const payload = req.body;
  if (payload.event === "charge.completed") {
    const { customer, tx_ref, flw_ref, amount, currency, status } = payload.data;
    
    if (status === "successful") {
      await connectToDatabase();
      const userKey = await UserKey.findOne({ email: customer.email, type: 'subscription' });
      if (userKey) {
        userKey.status = 'active';
        userKey.lastPaymentDate = new Date();
        userKey.nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await userKey.save();

        // Record recurring payment
        try {
          await Payment.create({
            email: customer.email,
            amount: amount,
            currency: currency || 'USD',
            type: 'subscription',
            flutterwaveRef: flw_ref || tx_ref,
            status: 'successful'
          });
        } catch (e: any) {
          console.log("Payment record already exists or failed:", e.message);
        }
      }
    }
  }
  res.status(200).end();
});

app.post("/api/user/dashboard", async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: "Key required" });

  await connectToDatabase();
  const userKey = await UserKey.findOne({ key });
  
  if (!userKey) {
    return res.status(404).json({ error: "Key not found" });
  }

  if (userKey.type === 'subscription' && userKey.nextPaymentDate) {
    if (new Date() > new Date(userKey.nextPaymentDate)) {
      userKey.status = 'inactive';
      await userKey.save();
      
      const config = await Config.findOne({ id: 'main_config' });
      if (config) {
        config.authorizedKeys = config.authorizedKeys.filter((k: string) => k !== key);
        await config.save();
      }
      
      return res.status(403).json({ error: "Subscription expired. Please renew." });
    }
  }

  if (userKey.status === 'inactive') {
    return res.status(403).json({ error: "Key is inactive" });
  }

  const stats = await RequestLog.aggregate([
    { $match: { uniqueKey: key } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const recentLogs = await RequestLog.find({ uniqueKey: key }).sort({ timestamp: -1 }).limit(20);

  res.json({ 
    success: true, 
    userKey: {
      email: userKey.email,
      type: userKey.type,
      status: userKey.status,
      nextPaymentDate: userKey.nextPaymentDate
    },
    stats,
    recentLogs
  });
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

  // Check subscription status for xon_ keys
  if (unique_key.startsWith('xon_')) {
    const userKey = await UserKey.findOne({ key: unique_key });
    if (userKey && userKey.type === 'subscription' && userKey.nextPaymentDate) {
      if (new Date() > new Date(userKey.nextPaymentDate)) {
        if (userKey.status !== 'inactive') {
          userKey.status = 'inactive';
          await userKey.save();
          // Remove from authorizedKeys
          const config = await Config.findOne({ id: 'main_config' });
          if (config) {
            config.authorizedKeys = config.authorizedKeys.filter((k: string) => k !== unique_key);
            await config.save();
          }
        }
        return res.status(401).json({ error: "Subscription expired. Please renew via dashboard." });
      }
    }
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
