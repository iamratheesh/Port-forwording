import axios from "axios";
import { useEffect, useState } from "react";

export default function Home() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState("http://localhost:3001");
  const [description, setDescription] = useState("");
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/webhooks");
      setWebhooks(response.data.webhooks);
    } catch (error) {
      alert("Error fetching webhooks: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();

    if (!target) {
      alert("Please enter a port or full URL");
      return;
    }

    // determine if target is a full URL or a port number
    const isUrl = /^https?:\/\//i.test(target);

    try {
      setLoading(true);
      const payload = { description };
      if (isUrl) payload.targetUrl = target;
      else payload.localhostPort = parseInt(target);

      const response = await axios.post("/api/webhooks", payload);

      alert("Webhook created successfully!");
      setTarget("http://localhost:3001");
      setDescription("");
      fetchWebhooks();
    } catch (error) {
      alert(
        "Error creating webhook: " + error.response?.data?.error ||
          error.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!confirm("Are you sure you want to delete this webhook?")) {
      return;
    }

    try {
      await axios.delete("/api/webhooks", {
        data: { webhookId },
      });
      alert("Webhook deleted successfully");
      fetchWebhooks();
    } catch (error) {
      alert("Error deleting webhook: " + error.message);
    }
  };

  const handleViewLogs = async (webhookId) => {
    try {
      const response = await axios.get(
        `/api/webhook/${webhookId}/logs?limit=20`,
      );
      setSelectedWebhook(webhookId);
      setLogs(response.data.logs);
      setShowLogs(true);
    } catch (error) {
      alert("Error fetching logs: " + error.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div style={styles.container}>
      <h1>🚀 Webhook Forwarder</h1>
      <p style={styles.subtitle}>
        Forward webhooks from your server to localhost for testing
      </p>

      <div style={styles.section}>
        <h2>Create New Webhook</h2>
        <form onSubmit={handleCreateWebhook} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Target (port or full URL) *</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g., 3001 or http://localhost:3000/webhook-test/abcd"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Stripe Webhook, Payment Testing"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Creating..." : "Create Webhook"}
          </button>
        </form>
      </div>

      <div style={styles.section}>
        <h2>Your Webhooks</h2>
        {webhooks.length === 0 ? (
          <p style={styles.empty}>No webhooks created yet. Create one above!</p>
        ) : (
          <div style={styles.webhookList}>
            {webhooks.map((webhook) => (
              <div key={webhook.webhookId} style={styles.webhookCard}>
                <div style={styles.webhookHeader}>
                  <h3>
                    {webhook.description || "Webhook"}
                    <span style={styles.port}>
                      {webhook.targetUrl
                        ? `Target: ${webhook.targetUrl}`
                        : `Port: ${webhook.localhostPort}`}
                    </span>
                  </h3>
                  <span style={styles.status}>
                    {webhook.triggerCount} triggers
                  </span>
                </div>

                <div style={styles.webhookDetails}>
                  <div style={styles.detailItem}>
                    <strong>Forwarding URL:</strong>
                    <div style={styles.urlBox}>
                      <code>{webhook.forwardingUrl}</code>
                      <button
                        onClick={() => copyToClipboard(webhook.forwardingUrl)}
                        style={styles.copyBtn}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div style={styles.detailItem}>
                    <strong>Webhook ID:</strong>
                    <code style={styles.code}>{webhook.webhookId}</code>
                  </div>

                  <div style={styles.detailItem}>
                    <strong>Created:</strong>
                    <span>{new Date(webhook.createdAt).toLocaleString()}</span>
                  </div>

                  {webhook.lastTriggered && (
                    <div style={styles.detailItem}>
                      <strong>Last Triggered:</strong>
                      <span>
                        {new Date(webhook.lastTriggered).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div style={styles.actions}>
                  <button
                    onClick={() => handleViewLogs(webhook.webhookId)}
                    style={styles.logBtn}
                  >
                    View Logs
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(webhook.webhookId)}
                    style={styles.deleteBtn}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLogs && (
        <div style={styles.section}>
          <h2>Webhook Logs - {selectedWebhook}</h2>
          <button onClick={() => setShowLogs(false)} style={styles.closeBtn}>
            Close
          </button>

          {logs.length === 0 ? (
            <p style={styles.empty}>No logs yet</p>
          ) : (
            <div style={styles.logsList}>
              {logs.map((log, index) => (
                <div key={index} style={styles.logItem}>
                  <div style={styles.logHeader}>
                    <span style={styles.logTime}>
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span style={styles.logStatus(log.statusCode)}>
                      {log.statusCode}
                    </span>
                  </div>

                  <div style={styles.logBody}>
                    <strong>Forward To:</strong> <code>{log.forwardedTo}</code>
                    <br />
                    <strong>Method:</strong> <code>{log.method}</code>
                    <br />
                    <strong>Headers:</strong>
                    <pre style={styles.pre}>
                      {JSON.stringify(log.headers, null, 2)}
                    </pre>
                    <strong>Body:</strong>
                    <pre style={styles.pre}>
                      {typeof log.body === "string"
                        ? log.body
                        : JSON.stringify(log.body, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={styles.helpSection}>
        <h2>How to Use</h2>
        <ol>
          <li>Create a webhook by entering a port or full target URL above</li>
          <li>Copy the generated forwarding URL</li>
          <li>
            Use the forwarding URL in your third-party service (Stripe, GitHub,
            etc.)
          </li>
          <li>
            Make sure your application is running on the specified localhost
            port
          </li>
          <li>
            All webhook calls will be forwarded to your localhost with all
            headers and body data
          </li>
          <li>Check the logs tab to see all forwarded requests</li>
        </ol>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  },
  subtitle: {
    color: "#666",
    fontSize: "16px",
    marginBottom: "30px",
  },
  section: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  form: {
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    flex: 1,
    minWidth: "250px",
  },
  input: {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
  deleteBtn: {
    padding: "8px 16px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },
  logBtn: {
    padding: "8px 16px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    marginRight: "10px",
  },
  closeBtn: {
    padding: "8px 16px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginBottom: "15px",
  },
  webhookList: {
    display: "grid",
    gap: "15px",
  },
  webhookCard: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "15px",
    backgroundColor: "#fafafa",
  },
  webhookHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    borderBottom: "1px solid #eee",
    paddingBottom: "10px",
  },
  port: {
    marginLeft: "10px",
    fontSize: "12px",
    color: "#666",
    fontWeight: "normal",
  },
  status: {
    fontSize: "12px",
    color: "#666",
  },
  webhookDetails: {
    marginBottom: "15px",
  },
  detailItem: {
    marginBottom: "10px",
    fontSize: "14px",
  },
  code: {
    backgroundColor: "#f0f0f0",
    padding: "2px 6px",
    borderRadius: "3px",
    fontFamily: "monospace",
    fontSize: "12px",
  },
  urlBox: {
    display: "flex",
    gap: "10px",
    marginTop: "5px",
    alignItems: "center",
  },
  copyBtn: {
    padding: "5px 10px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px",
  },
  actions: {
    display: "flex",
    gap: "10px",
  },
  empty: {
    color: "#999",
    fontStyle: "italic",
    padding: "20px",
    textAlign: "center",
  },
  logsList: {
    display: "grid",
    gap: "15px",
  },
  logItem: {
    border: "1px solid #ddd",
    borderRadius: "4px",
    padding: "10px",
    backgroundColor: "#fafafa",
  },
  logHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    paddingBottom: "10px",
    borderBottom: "1px solid #eee",
  },
  logTime: {
    fontSize: "12px",
    color: "#666",
  },
  logStatus: (status) => ({
    fontSize: "12px",
    color: "white",
    backgroundColor:
      status >= 200 && status < 300
        ? "#28a745"
        : status >= 400
          ? "#dc3545"
          : "#ffc107",
    padding: "2px 8px",
    borderRadius: "3px",
    fontWeight: "bold",
  }),
  logBody: {
    fontSize: "12px",
  },
  pre: {
    backgroundColor: "#f5f5f5",
    padding: "10px",
    borderRadius: "4px",
    overflow: "auto",
    maxHeight: "200px",
    fontSize: "11px",
    margin: "5px 0",
  },
  helpSection: {
    backgroundColor: "#e7f3ff",
    border: "1px solid #b3d9ff",
    borderRadius: "8px",
    padding: "20px",
    marginTop: "30px",
  },
};
