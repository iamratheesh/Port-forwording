import {
  createWebhook,
  deleteWebhook,
  getAllWebhooks,
  initializeCollections,
} from "../../lib/webhookService";

export default async function handler(req, res) {
  // Initialize collections on first call
  try {
    await initializeCollections();
  } catch (error) {
    console.log("Collections already initialized");
  }

  if (req.method === "POST") {
    try {
      const { localhostPort, targetUrl, description } = req.body;

      // Validation: accept either a numeric port or a full URL
      if (!localhostPort && !targetUrl) {
        return res.status(400).json({
          error:
            "Provide either 'localhostPort' (number) or 'targetUrl' (full URL)",
          example: { localhostPort: 3001, description: "My test webhook" },
        });
      }

      if (localhostPort) {
        if (typeof localhostPort !== "number") {
          return res
            .status(400)
            .json({ error: "localhostPort must be a number" });
        }
        if (localhostPort < 1 || localhostPort > 65535) {
          return res
            .status(400)
            .json({ error: "Port must be between 1 and 65535" });
        }
      }

      if (targetUrl) {
        try {
          new URL(targetUrl);
        } catch (err) {
          return res
            .status(400)
            .json({ error: "targetUrl must be a valid URL" });
        }
      }

      const webhook = await createWebhook({
        localhostPort,
        targetUrl,
        description,
      });

      return res.status(201).json({
        success: true,
        message: "Webhook created successfully",
        webhook: {
          webhookId: webhook.webhookId,
          forwardingUrl: webhook.forwardingUrl,
          localhostPort: webhook.localhostPort,
          targetUrl: webhook.targetUrl,
          description: webhook.description,
          createdAt: webhook.createdAt,
        },
      });
    } catch (error) {
      console.error("Error creating webhook:", error);
      return res
        .status(500)
        .json({ error: "Failed to create webhook", details: error.message });
    }
  }

  if (req.method === "GET") {
    try {
      const webhooks = await getAllWebhooks();

      const sanitized = webhooks.map((w) => ({
        webhookId: w.webhookId,
        forwardingUrl: w.forwardingUrl,
        localhostPort: w.localhostPort,
        targetUrl: w.targetUrl,
        description: w.description,
        createdAt: w.createdAt,
        lastTriggered: w.lastTriggered,
        triggerCount: w.triggerCount,
        isActive: w.isActive,
      }));

      return res.status(200).json({
        success: true,
        count: sanitized.length,
        webhooks: sanitized,
      });
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      return res.status(500).json({
        error: "Failed to fetch webhooks",
        details: error.message,
        message: "Make sure MONGODB_URI is set in Vercel environment variables"
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { webhookId } = req.body;

      if (!webhookId) {
        return res.status(400).json({
          error: "webhookId is required",
        });
      }

      await deleteWebhook(webhookId);

      return res.status(200).json({
        success: true,
        message: "Webhook deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting webhook:", error);
      return res.status(500).json({
        error: "Failed to delete webhook",
        details: error.message,
      });
    }
  }

  return res.status(405).json({
    error: "Method not allowed. Use POST, GET, or DELETE",
  });
}
