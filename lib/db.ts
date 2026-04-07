import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not defined. Falling back to local data.json if available.');
}

// Define Interface
interface IConfig extends mongoose.Document {
  id: string;
  groqKeys: string[];
  authorizedKeys: string[];
}

// Define Schema
const ConfigSchema = new mongoose.Schema<IConfig>({
  id: { type: String, default: 'main_config', unique: true },
  groqKeys: [String],
  authorizedKeys: [String]
}, { timestamps: true });

export const Config = mongoose.models.Config || mongoose.model<IConfig>('Config', ConfigSchema);

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
