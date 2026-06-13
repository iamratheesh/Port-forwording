/**
 * EXAMPLE: Local Webhook Test Server
 * 
 * This is a simple example of a local application that receives
 * the forwarded webhooks from the webhook forwarder.
 * 
 * Run this on your local machine on a specific port (e.g., 3001)
 * Then register that port with the webhook forwarder.
 * 
 * Installation:
 * npm install express dotenv
 * 
 * Run:
 * node test-server.js
 */

const express = require('express');
const app = express();

app.use(express.json());

// Webhook endpoint that receives forwarded requests
app.post('/webhook', (req, res) => {
  console.log('\n=== WEBHOOK RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('======================\n');

  // Send success response back to the webhook forwarder
  res.status(200).json({
    received: true,
    message: 'Webhook processed successfully',
    timestamp: new Date().toISOString()
  });
});

// Another example: Stripe-like webhook endpoint
app.post('/stripe-webhook', (req, res) => {
  const event = req.body;

  console.log('\n=== STRIPE WEBHOOK RECEIVED ===');
  console.log('Event Type:', event.type);
  console.log('Event ID:', event.id);
  console.log('Data:', JSON.stringify(event.data, null, 2));
  console.log('================================\n');

  // Handle different event types
  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('✅ Payment succeeded!');
      // Handle successful payment
      break;

    case 'payment_intent.payment_failed':
      console.log('❌ Payment failed!');
      // Handle failed payment
      break;

    case 'customer.subscription.updated':
      console.log('📝 Subscription updated!');
      // Handle subscription update
      break;

    default:
      console.log('⚠️ Unhandled event type:', event.type);
  }

  // Send success response
  res.status(200).json({ received: true });
});

// Example: GitHub webhook endpoint
app.post('/github-webhook', (req, res) => {
  const event = req.headers['x-github-event'];
  const delivery = req.headers['x-github-delivery'];

  console.log('\n=== GITHUB WEBHOOK RECEIVED ===');
  console.log('Event Type:', event);
  console.log('Delivery ID:', delivery);
  console.log('Payload:', JSON.stringify(req.body, null, 2));
  console.log('================================\n');

  switch (event) {
    case 'push':
      console.log('📤 Code pushed!');
      console.log('Branches:', req.body.ref);
      console.log('Commits:', req.body.commits.length);
      break;

    case 'pull_request':
      console.log('🔀 Pull request:', req.body.action);
      console.log('PR #:', req.body.pull_request.number);
      break;

    case 'issues':
      console.log('🐛 Issue:', req.body.action);
      console.log('Issue #:', req.body.issue.number);
      break;

    default:
      console.log('⚠️ Unhandled GitHub event:', event);
  }

  res.status(200).json({ received: true });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    webhookEndpoints: [
      'POST /webhook',
      'POST /stripe-webhook',
      'POST /github-webhook'
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Test Webhook Server running on http://localhost:${PORT}`);
  console.log(`\nWebhook endpoints:`);
  console.log(`  POST http://localhost:${PORT}/webhook`);
  console.log(`  POST http://localhost:${PORT}/stripe-webhook`);
  console.log(`  POST http://localhost:${PORT}/github-webhook`);
  console.log(`\nHealth check: http://localhost:${PORT}/health`);
  console.log('\nWaiting for webhooks...\n');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n✋ Shutting down gracefully...');
  process.exit(0);
});
