import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined. Please add it to your Vercel project settings.');
}

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('MONGODB_URI present:', !!MONGODB_URI);

    const client = new MongoClient(MONGODB_URI, {
      tls: true,
      tlsAllowInvalidCertificates: false,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 8000,
      retryWrites: false,
      maxPoolSize: 1,
      minPoolSize: 0,
    });

    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout after 8 seconds')), 8000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    console.log('Connected to MongoDB');

    const db = client.db('webhook-forwarder');
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
    });
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
}

export async function closeDatabase(client) {
  if (client) {
    await client.close();
    cachedClient = null;
    cachedDb = null;
  }
}
