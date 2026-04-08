import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not defined. Falling back to local data.json if available.');
}

// Define Interfaces
interface IConfig extends mongoose.Document {
  id: string;
  groqKeys: string[];
  authorizedKeys: string[];
}

interface IRequestLog extends mongoose.Document {
  timestamp: Date;
  uniqueKey: string;
  aiModel: string;
  status: 'success' | 'error' | 'fallback';
  errorCode?: number;
  errorMessage?: string;
  attempts: number;
}

// Define Schemas
const ConfigSchema = new mongoose.Schema<IConfig>({
  id: { type: String, default: 'main_config', unique: true },
  groqKeys: [String],
  authorizedKeys: [String]
}, { timestamps: true });

const RequestLogSchema = new mongoose.Schema<IRequestLog>({
  timestamp: { type: Date, default: Date.now, index: true },
  uniqueKey: { type: String, index: true },
  aiModel: String,
  status: { type: String, enum: ['success', 'error', 'fallback'], index: true },
  errorCode: Number,
  errorMessage: String,
  attempts: { type: Number, default: 1 }
});

export const Config = mongoose.models.Config || mongoose.model<IConfig>('Config', ConfigSchema);
export const RequestLog = mongoose.models.RequestLog || mongoose.model<IRequestLog>('RequestLog', RequestLogSchema);

let cachedConnection: typeof mongoose | null = null;

export async function connectToDatabase() {
  if (cachedConnection) return cachedConnection;

  if (!MONGODB_URI) return null;

  try {
    const conn = await mongoose.connect(MONGODB_URI);
    cachedConnection = conn;
    console.log('Successfully connected to MongoDB');
    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return null;
  }
}
