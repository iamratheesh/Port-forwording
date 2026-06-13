import { connectToDatabase } from "../../lib/mongodb";

export default async function handler(req, res) {
  try {
    console.log("Health check started");
    console.log("MONGODB_URI defined:", !!process.env.MONGODB_URI);

    const { client, db } = await connectToDatabase();

    const adminDb = client.db().admin();
    const status = await adminDb.ping();

    return res.status(200).json({
      success: true,
      message: "MongoDB connection successful",
      mongodbConnected: !!status,
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return res.status(500).json({
      success: false,
      error: "MongoDB connection failed",
      details: error.message,
      mongodbUriDefined: !!process.env.MONGODB_URI,
    });
  }
}
