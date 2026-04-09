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
  flwPlanId?: string;
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
  authorizedKeys: [String],
  flwPlanId: String
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

interface IUserKey extends mongoose.Document {
  key: string;
  email: string;
  type: 'subscription' | 'onetime';
  status: 'active' | 'inactive';
  lastPaymentDate: Date;
  nextPaymentDate?: Date;
  flutterwaveRef?: string;
  flwSubscriptionId?: string;
  createdAt: Date;
}

const UserKeySchema = new mongoose.Schema<IUserKey>({
  key: { type: String, unique: true, required: true },
  email: { type: String, required: true },
  type: { type: String, enum: ['subscription', 'onetime'], required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  lastPaymentDate: { type: Date, default: Date.now },
  nextPaymentDate: { type: Date },
  flutterwaveRef: { type: String },
  flwSubscriptionId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const UserKey = mongoose.models.UserKey || mongoose.model<IUserKey>('UserKey', UserKeySchema);

interface IPayment extends mongoose.Document {
  email: string;
  amount: number;
  currency: string;
  type: 'subscription' | 'onetime';
  flutterwaveRef: string;
  status: string;
  timestamp: Date;
}

const PaymentSchema = new mongoose.Schema<IPayment>({
  email: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  type: { type: String, enum: ['subscription', 'onetime'], required: true },
  flutterwaveRef: { type: String, required: true, unique: true },
  status: { type: String, default: 'successful' },
  timestamp: { type: Date, default: Date.now }
});

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

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
