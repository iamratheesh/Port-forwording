import { connectToDatabase } from "./mongodb";

export async function initializeCollections() {
  const { db } = await connectToDatabase();

  // Create webhooks collection with indexes
  try {
    await db.createCollection("webhooks");
  } catch (error) {
    // Collection might already exist
  }

  // Create webhook logs collection
  try {
    await db.createCollection("webhook_logs");
  } catch (error) {
    // Collection might already exist
  }

  // Create indexes
  await db
    .collection("webhooks")
    .createIndex({ webhookId: 1 }, { unique: true });
  await db.collection("webhooks").createIndex({ createdAt: 1 });
  await db.collection("webhook_logs").createIndex({ webhookId: 1 });
  await db.collection("webhook_logs").createIndex({ createdAt: 1 });
}

export async function createWebhook(data) {
  const { db } = await connectToDatabase();

  const id = generateWebhookId();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
  const webhook = {
    webhookId: id,
    localhostPort: data.localhostPort || null,
    targetUrl: data.targetUrl || null,
    forwardingUrl: `${baseUrl}/api/webhook/${id}`,
    description: data.description || "",
    createdAt: new Date(),
    lastTriggered: null,
    triggerCount: 0,
    isActive: true,
  };

  const result = await db.collection("webhooks").insertOne(webhook);
  return webhook;
}

export async function getWebhookById(webhookId) {
  const { db } = await connectToDatabase();
  return await db.collection("webhooks").findOne({ webhookId });
}

export async function getAllWebhooks() {
  const { db } = await connectToDatabase();
  return await db.collection("webhooks").find({}).toArray();
}

export async function updateWebhookTrigger(webhookId) {
  const { db } = await connectToDatabase();

  await db.collection("webhooks").updateOne(
    { webhookId },
    {
      $set: { lastTriggered: new Date() },
      $inc: { triggerCount: 1 },
    },
  );
}

export async function logWebhookEvent(webhookId, requestData) {
  const { db } = await connectToDatabase();

  const log = {
    webhookId,
    timestamp: new Date(),
    method: requestData.method,
    headers: requestData.headers,
    body: requestData.body,
    query: requestData.query,
    statusCode: requestData.statusCode,
    forwardedTo: requestData.forwardedTo,
  };

  await db.collection("webhook_logs").insertOne(log);
}

export async function getWebhookLogs(webhookId, limit = 50) {
  const { db } = await connectToDatabase();

  return await db
    .collection("webhook_logs")
    .find({ webhookId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

export async function deleteWebhook(webhookId) {
  const { db } = await connectToDatabase();

  await db.collection("webhooks").deleteOne({ webhookId });
  await db.collection("webhook_logs").deleteMany({ webhookId });
}

function generateWebhookId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
