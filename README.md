# 🚀 Webhook Forwarder

A simple Next.js webhook forwarding tool that allows you to receive webhooks on a server and forward them to your localhost for testing and development.

## Features

- ✅ Simple webhook registration with custom localhost ports
- ✅ Automatic forwarding of all request data (headers, body, query params)
- ✅ Detailed logging of all webhook events
- ✅ Real-time webhook management dashboard
- ✅ MongoDB storage for webhook data and logs
- ✅ RESTful API for programmatic access

## Prerequisites

- Node.js 16+ installed
- MongoDB instance (local or Atlas)
- npm or yarn package manager

## Setup Instructions

### 1. Install Dependencies

```bash
cd webhook-forwarder
npm install
```

### 2. Configure MongoDB

Update the `.env.local` file with your MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/webhook-forwarder
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
```

**MongoDB Setup Options:**

**Option A: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a cluster
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/webhook-forwarder`

**Option B: Local MongoDB**
```bash
# Install MongoDB locally
# macOS:
brew install mongodb-community

# Linux (Ubuntu):
sudo apt-get install -y mongodb

# Windows: Download from https://www.mongodb.com/try/download/community

# Start MongoDB:
mongod
```

Then use:
```env
MONGODB_URI=mongodb://localhost:27017/webhook-forwarder
```

### 3. Run the Application

**Development Mode:**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm start
```

Visit `http://localhost:3000` in your browser.

## Usage

### Step 1: Create a Webhook

1. Go to http://localhost:3000
2. Enter your localhost port (e.g., 3001, 3002)
3. Add an optional description
4. Click "Create Webhook"

### Step 2: Get Your Forwarding URL

The system will generate a unique forwarding URL like:
```
http://your-server.com/api/webhook/abc123def456
```

### Step 3: Configure Your Third-Party Service

Use the forwarding URL in your third-party service:
- **Stripe**: Webhook Endpoint
- **GitHub**: Repository Webhooks
- **Slack**: Slash Commands
- **Custom Services**: Any webhook URL field

### Step 4: Start Your Local Application

Make sure your application is running on the specified port:

```bash
# In another terminal, start your local app
npm run dev -- -p 3001
# or
node app.js  # on port 3001
```

### Step 5: Monitor Webhooks

The dashboard shows:
- All registered webhooks
- Trigger count
- Last triggered time
- Full request logs (headers, body, query params)

## API Endpoints

### Create Webhook

**POST** `/api/webhooks`

```json
{
  "localhostPort": 3001,
  "description": "Stripe Payment Webhook"
}
```

Response:
```json
{
  "success": true,
  "webhook": {
    "webhookId": "abc123def456",
    "forwardingUrl": "http://your-server.com/api/webhook/abc123def456",
    "localhostPort": 3001,
    "description": "Stripe Payment Webhook"
  }
}
```

### Get All Webhooks

**GET** `/api/webhooks`

Response:
```json
{
  "success": true,
  "count": 2,
  "webhooks": [...]
}
```

### Delete Webhook

**DELETE** `/api/webhooks`

```json
{
  "webhookId": "abc123def456"
}
```

### Get Webhook Logs

**GET** `/api/webhook/[webhookId]/logs?limit=50`

Response:
```json
{
  "success": true,
  "webhookId": "abc123def456",
  "totalLogs": 5,
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "method": "POST",
      "headers": {...},
      "body": {...},
      "statusCode": 200,
      "forwardedTo": "http://localhost:3001/webhook"
    }
  ]
}
```

### Receive Webhook (Automatic)

**POST** `/api/webhook/[webhookId]`

Your external service sends data here, and it's automatically forwarded to `http://localhost:[port]` with all original headers and body preserved.

## Example: Testing with Stripe

### 1. Create Webhook
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"localhostPort": 3001, "description": "Stripe Testing"}'
```

Response:
```json
{
  "webhook": {
    "forwardingUrl": "http://your-server.com/api/webhook/abc123def456"
  }
}
```

### 2. Add to Stripe Dashboard
- Go to Developers → Webhooks
- Add Endpoint: `http://your-server.com/api/webhook/abc123def456`
- Select events (e.g., `payment_intent.succeeded`)

### 3. Start Your Local Webhook Handler
```javascript
// server.js (listening on port 3001)
import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('Received webhook:', req.body);
  res.json({ received: true });
});

app.listen(3001, () => console.log('Listening on port 3001'));
```

### 4. Trigger Test Event
In Stripe Dashboard, click "Send a test event" → Webhook will be forwarded to your localhost:3001

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
MONGODB_URI = your_mongodb_connection_string
```

### Deploy to Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set MONGODB_URI=mongodb+srv://...

# Deploy
git push heroku main
```

### Deploy to Self-Hosted Server

```bash
# SSH into your server
ssh user@your-server.com

# Clone repository
git clone your-repo.git
cd webhook-forwarder

# Install dependencies
npm install

# Create .env.local
echo "MONGODB_URI=mongodb://..." > .env.local

# Build and start
npm run build
npm start
```

## Troubleshooting

### "Failed to forward webhook"
- Ensure your localhost application is running on the specified port
- Check firewall settings
- Verify the port number is correct

### "Webhook not found"
- Double-check the webhook ID in the URL
- Make sure the webhook hasn't been deleted

### "MongoDB connection error"
- Verify your MONGODB_URI is correct
- Check MongoDB is running (if local)
- Ensure MongoDB Atlas IP whitelist includes your server IP
- Verify network connectivity

### "502 Bad Gateway"
- Your localhost server didn't respond
- Check if application is running on the correct port
- Look at server logs for errors

## Project Structure

```
webhook-forwarder/
├── pages/
│   ├── api/
│   │   ├── webhooks.js                 # Webhook CRUD operations
│   │   └── webhook/
│   │       ├── [webhookId].js          # Forward webhooks to localhost
│   │       └── [webhookId]/logs.js     # View webhook logs
│   └── index.js                         # Dashboard UI
├── lib/
│   ├── mongodb.js                       # MongoDB connection
│   └── webhookService.js                # Webhook business logic
├── .env.local                           # Environment variables
├── next.config.js                       # Next.js configuration
└── package.json                         # Dependencies
```

## Performance Tips

- Keep MongoDB indexes optimized for webhook lookup
- Archive old logs periodically
- Use connection pooling for MongoDB
- Monitor server resources

## Security Notes

- Change the API_KEY in .env.local
- Use HTTPS in production
- Validate webhook signatures from third-party services
- Implement rate limiting for production
- Store sensitive data securely

## Support

For issues or questions:
1. Check logs in the dashboard
2. Review MongoDB for data
3. Check browser console for errors
4. Review server logs for details

## License

MIT License - feel free to use and modify!
# Port-forwording
