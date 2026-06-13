import { getWebhookLogs } from "../../../../lib/webhookService";

export default async function handler(req, res) {
  const { webhookId } = req.query;

  if (!webhookId) {
    return res.status(400).json({ error: "Webhook ID is required" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET" });
  }

  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await getWebhookLogs(webhookId, Math.min(limit, 100));

    return res.status(200).json({
      success: true,
      webhookId,
      totalLogs: logs.length,
      logs: logs.map((log) => ({
        timestamp: log.timestamp,
        method: log.method,
        headers: log.headers,
        body: log.body,
        query: log.query,
        statusCode: log.statusCode,
        forwardedTo: log.forwardedTo,
        error: log.error || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    return res.status(500).json({
      error: "Failed to fetch webhook logs",
      details: error.message,
    });
  }
}
