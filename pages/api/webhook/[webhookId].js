import axios from "axios";
import {
  getWebhookById,
  logWebhookEvent,
  updateWebhookTrigger,
} from "../../../lib/webhookService";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  const { webhookId } = req.query;

  if (!webhookId) {
    return res.status(400).json({ error: "Webhook ID is required" });
  }

  try {
    console.log(`[${new Date().toISOString()}] Processing webhook for ${webhookId}`);
    console.log(`MONGODB_URI: ${!!process.env.MONGODB_URI}`);

    // Get webhook configuration
    let webhook;
    try {
      webhook = await getWebhookById(webhookId);
    } catch (dbError) {
      console.error("DB Error:", dbError.message);
      return res.status(503).json({
        error: "Database connection failed",
        details: dbError.message,
      });
    }

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    if (!webhook.isActive) {
      return res.status(403).json({ error: "Webhook is not active" });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST requests are supported" });
    }

    const suffix = req.url.replace(`/api/webhook/${webhookId}`, "");
    let forwardUrl;

    if (webhook.targetUrl) {
      if (suffix && webhook.targetUrl.endsWith("/") && suffix.startsWith("/")) {
        forwardUrl = webhook.targetUrl.slice(0, -1) + suffix;
      } else {
        forwardUrl = webhook.targetUrl + suffix;
      }
    } else {
      forwardUrl = `http://localhost:${webhook.localhostPort}${suffix}`;
    }

    const rawBody = await getRawBody(req);
    const contentType = req.headers["content-type"] || "";

    let loggedBody = rawBody;
    if (Buffer.isBuffer(rawBody)) {
      const bodyText = rawBody.toString("utf8");
      if (contentType.includes("application/json")) {
        try {
          loggedBody = JSON.parse(bodyText);
        } catch {
          loggedBody = bodyText;
        }
      } else {
        loggedBody = bodyText;
      }
    }

    const headersToForward = { ...req.headers };
    delete headersToForward.host;
    delete headersToForward.connection;
    delete headersToForward["content-length"];
    delete headersToForward["transfer-encoding"];

    const forwardResponse = await axios({
      method: req.method,
      url: forwardUrl,
      headers: headersToForward,
      data: rawBody,
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    await logWebhookEvent(webhookId, {
      method: req.method,
      headers: req.headers,
      body: loggedBody,
      query: req.query,
      statusCode: forwardResponse.status,
      forwardedTo: forwardUrl,
    });

    await updateWebhookTrigger(webhookId);

    return res.status(forwardResponse.status).json({
      success: true,
      forwarded: true,
      originalResponse: forwardResponse.data,
      forwardedTo: forwardUrl,
    });
  } catch (error) {
    console.error("Handler error:", error.message);
    console.error("Stack:", error.stack);

    try {
      await logWebhookEvent(webhookId, {
        method: req.method,
        headers: req.headers,
        body: null,
        query: req.query,
        statusCode: 500,
        forwardedTo: "unknown",
        error: error.message,
      });
    } catch (logError) {
      console.error("Log failed:", logError.message);
    }

    return res.status(500).json({
      error: "Webhook processing failed",
      details: error.message,
    });
  }
}
