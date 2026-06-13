import axios from "axios";
import {
  getWebhookById,
  logWebhookEvent,
  updateWebhookTrigger,
} from "../../../lib/webhookService";

export default async function handler(req, res) {
  const { webhookId } = req.query;

  if (!webhookId) {
    return res.status(400).json({ error: "Webhook ID is required" });
  }

  try {
    // Get webhook configuration
    const webhook = await getWebhookById(webhookId);

    if (!webhook) {
      return res.status(404).json({
        error: "Webhook not found",
        webhookId,
      });
    }

    if (!webhook.isActive) {
      return res.status(403).json({
        error: "Webhook is not active",
      });
    }

    // Only handle POST requests for now
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Only POST requests are supported",
      });
    }

    // Determine forward URL: prefer explicit targetUrl, otherwise use localhostPort
    const suffix = req.url.replace(`/api/webhook/${webhookId}`, "");
    let forwardUrl;
    if (webhook.targetUrl) {
      // Append any suffix to the provided targetUrl
      if (suffix && webhook.targetUrl.endsWith("/") && suffix.startsWith("/")) {
        forwardUrl = webhook.targetUrl.slice(0, -1) + suffix;
      } else {
        forwardUrl = webhook.targetUrl + suffix;
      }
    } else {
      forwardUrl = `http://localhost:${webhook.localhostPort}${suffix}`;
    }

    // Prepare headers (exclude host and connection headers)
    const headersToForward = { ...req.headers };
    delete headersToForward.host;
    delete headersToForward.connection;
    delete headersToForward["content-length"];
    delete headersToForward["transfer-encoding"];

    // Forward the request to localhost/target preserving body format
    const forwardResponse = await axios({
      method: req.method,
      url: forwardUrl,
      headers: headersToForward,
      data: req.body,
      validateStatus: () => true, // Don't throw on any status code
    });

    // Log the webhook event
    await logWebhookEvent(webhookId, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      statusCode: forwardResponse.status,
      forwardedTo: forwardUrl,
    });

    // Update webhook trigger count
    await updateWebhookTrigger(webhookId);

    // Return the forwarded response to the original caller
    return res.status(forwardResponse.status).json({
      success: true,
      forwarded: true,
      originalResponse: forwardResponse.data,
      forwardedTo: forwardUrl,
      webhook: {
        webhookId,
        localhostPort: webhook.localhostPort,
      },
    });
  } catch (error) {
    console.error("Error forwarding webhook:", error.message);

    // Log the failed attempt
    try {
      await logWebhookEvent(webhookId, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
        statusCode: 500,
        forwardedTo:
          webhook?.targetUrl || `http://localhost:${webhook?.localhostPort}`,
        error: error.message,
      });
    } catch (logError) {
      console.error("Failed to log webhook error:", logError);
    }

    return res.status(502).json({
      error: "Failed to forward webhook",
      details: error.message,
      webhookId,
      hint: webhook?.targetUrl
        ? `Make sure the target URL ${webhook.targetUrl} is reachable`
        : `Make sure your localhost:${webhook?.localhostPort} is running and accepting POST requests`,
    });
  }
}
