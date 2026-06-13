# 📖 Quick Start Guide - Webhook Forwarder

## 🎯 5-Minute Setup

### Step 1: Install & Configure

```bash
# 1. Clone or create the project directory
mkdir webhook-forwarder
cd webhook-forwarder

# 2. Install dependencies
npm install

# 3. Configure .env.local
cat > .env.local << EOF
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/webhook-forwarder
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
EOF
```

### Step 2: Start the Application

```bash
# Terminal 1: Start the Webhook Forwarder
npm run dev
# Opens on http://localhost:3000

# Terminal 2: Start your test server (in the same directory)
node test-server.js
# Running on http://localhost:3001
```

### Step 3: Create a Webhook

Visit http://localhost:3000 and:
1. Enter port: `3001`
2. Description: `Test Webhook`
3. Click "Create Webhook"
4. Copy the forwarding URL

## 🔧 API Examples

### Example 1: Create Webhook via cURL

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "localhostPort": 3001,
    "description": "My Test Webhook"
  }'
```

Response:
```json
{
  "success": true,
  "webhook": {
    "webhookId": "abc123def456",
    "forwardingUrl": "http://localhost:3000/api/webhook/abc123def456",
    "localhostPort": 3001,
    "description": "My Test Webhook",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Example 2: Get All Webhooks

```bash
curl http://localhost:3000/api/webhooks
```

### Example 3: Send a Webhook Request

```bash
# Using the forwarding URL from step 1
curl -X POST http://localhost:3000/api/webhook/abc123def456 \
  -H "Content-Type: application/json" \
  -H "X-Custom-Header: test-value" \
  -d '{
    "event": "payment.completed",
    "amount": 99.99,
    "customer_id": "cus_12345"
  }'
```

This will forward to your local server:
```
POST http://localhost:3001/
Headers: (all original headers preserved)
Body: {
  "event": "payment.completed",
  "amount": 99.99,
  "customer_id": "cus_12345"
}
```

### Example 4: View Webhook Logs

```bash
curl "http://localhost:3000/api/webhook/abc123def456/logs?limit=10"
```

Response:
```json
{
  "success": true,
  "webhookId": "abc123def456",
  "totalLogs": 3,
  "logs": [
    {
      "timestamp": "2024-01-15T10:35:00.000Z",
      "method": "POST",
      "statusCode": 200,
      "forwardedTo": "http://localhost:3001/",
      "headers": {...},
      "body": {...}
    }
  ]
}
```

### Example 5: Delete Webhook

```bash
curl -X DELETE http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"webhookId": "abc123def456"}'
```

## 🚀 Real-World Scenarios

### Scenario 1: Testing Stripe Webhooks

**Step 1:** Create webhook for Stripe
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "localhostPort": 3001,
    "description": "Stripe Payment Webhook"
  }'
```

Response includes:
```
forwardingUrl: http://your-server.com/api/webhook/xyz789abc
```

**Step 2:** Add to Stripe Dashboard
- Go to: Developers → Webhooks → Add endpoint
- Paste: `http://your-server.com/api/webhook/xyz789abc`
- Select events: `payment_intent.succeeded`, `charge.failed`

**Step 3:** Test Payment
- Make a test payment in Stripe Dashboard
- Check your logs dashboard or:
```bash
curl "http://localhost:3000/api/webhook/xyz789abc/logs"
```

**Step 4:** Your test-server.js receives:
```javascript
// Logged in Terminal 2
=== WEBHOOK RECEIVED ===
Timestamp: 2024-01-15T10:35:00.000Z
Headers: {
  "x-stripe-signature": "t=123...",
  "stripe-version": "2023-10-16",
  ...
}
Body: {
  "id": "evt_1234567890",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "amount": 5000,
      ...
    }
  }
}
```

### Scenario 2: Testing GitHub Webhooks

**Step 1:** Create webhook
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "localhostPort": 3001,
    "description": "GitHub Push Webhook"
  }'
```

**Step 2:** Add to GitHub
- Repository → Settings → Webhooks → Add webhook
- Payload URL: `http://your-server.com/api/webhook/xyz789abc`
- Event: `push`

**Step 3:** Push to GitHub
```bash
git push origin main
```

**Step 4:** Your test-server.js receives:
```javascript
=== GITHUB WEBHOOK RECEIVED ===
Event Type: push
Delivery ID: abc123def456
Payload: {
  "ref": "refs/heads/main",
  "commits": [...],
  "repository": {...}
}
```

### Scenario 3: Testing Custom Service

**Step 1:** Create webhook
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "localhostPort": 3001,
    "description": "Custom Service Webhook"
  }'
```

**Step 2:** Use forwarding URL in your service config

**Step 3:** Simulate webhook from your service
```bash
curl -X POST http://localhost:3000/api/webhook/xyz789abc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "event_type": "order.created",
    "order_id": "12345",
    "total_amount": 299.99
  }'
```

**Step 4:** Logs appear in dashboard and terminal:
```
=== WEBHOOK RECEIVED ===
Timestamp: 2024-01-15T10:35:00.000Z
Headers: {
  "x-api-key": "your-api-key",
  "content-type": "application/json"
}
Body: {
  "event_type": "order.created",
  "order_id": "12345",
  "total_amount": 299.99
}
```

## 📊 Monitoring Webhooks

### Via Dashboard (Web UI)
- Open http://localhost:3000
- See all webhooks with trigger counts
- Click "View Logs" to see request details

### Via API
```bash
# Get webhook logs
curl "http://localhost:3000/api/webhook/xyz789abc/logs?limit=20"

# Parse specific information
curl "http://localhost:3000/api/webhook/xyz789abc/logs" | jq '.logs[] | {timestamp, statusCode, body}'
```

### Via Terminal
```bash
# Watch for new webhooks (with tail)
curl "http://localhost:3000/api/webhook/xyz789abc/logs?limit=5" | jq
```

## 🛠️ Troubleshooting

### Webhook not forwarding?

1. **Check if test server is running:**
```bash
curl http://localhost:3001/health
```

2. **Check webhook exists:**
```bash
curl http://localhost:3000/api/webhooks
```

3. **View logs for errors:**
```bash
curl "http://localhost:3000/api/webhook/xyz789abc/logs" | jq '.logs[-1]'
```

4. **Test manually:**
```bash
curl -X POST http://localhost:3000/api/webhook/xyz789abc \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### MongoDB Connection Issues?

```bash
# Check connection
# In your .env.local, verify:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/webhook-forwarder

# Test connection with mongo shell:
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/webhook-forwarder"
```

### Port Already in Use?

```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

## 📝 Common Patterns

### Pattern 1: Validate Webhook Signature
```javascript
// In your test-server.js
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-signature'];
  
  // Verify signature matches your secret
  if (!verifySignature(signature, req.body)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  res.json({ received: true });
});
```

### Pattern 2: Retry on Failure
```javascript
// In webhook forwarder (pages/api/webhook/[webhookId].js)
let retries = 3;
let lastError;

while (retries > 0) {
  try {
    const response = await axios.post(forwardUrl, req.body);
    return res.json({ success: true });
  } catch (error) {
    lastError = error;
    retries--;
    await sleep(1000); // Wait 1 second before retry
  }
}

return res.status(502).json({ error: lastError.message });
```

### Pattern 3: Filter Webhooks
```bash
# Only get logs with status 200
curl "http://localhost:3000/api/webhook/xyz789abc/logs" | \
  jq '.logs[] | select(.statusCode == 200)'

# Get failed webhooks
curl "http://localhost:3000/api/webhook/xyz789abc/logs" | \
  jq '.logs[] | select(.statusCode >= 400)'
```

## 🎓 Learn More

- Check `/pages/api/` for API implementation
- Check `test-server.js` for webhook handling examples
- See `README.md` for detailed documentation

Happy webhook testing! 🎉
