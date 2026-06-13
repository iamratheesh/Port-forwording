# 🚀 Production Deployment & Advanced Configuration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Third-Party Services                       │
│  (Stripe, GitHub, Slack, Custom Services, etc.)             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ POST /api/webhook/abc123
                 │ (HTTPS)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          Webhook Forwarder Server                            │
│          (Your Production Server)                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Next.js Application                                  │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │ API Route: /api/webhook/[webhookId]           │  │  │
│  │ │ - Receives webhook                            │  │  │
│  │ │ - Validates webhook ID                        │  │  │
│  │ │ - Logs request to MongoDB                     │  │  │
│  │ │ - Forwards to localhost:port                 │  │  │
│  │ │ - Returns response                            │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │ API Route: /api/webhooks                       │  │  │
│  │ │ - CRUD operations for webhooks                │  │  │
│  │ │ - Dashboard data                              │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │ Dashboard UI                                   │  │  │
│  │ │ - Create/manage webhooks                       │  │  │
│  │ │ - View logs                                    │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         │ localhost:3001 (internal network) │
│                         │ (HTTP)                            │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │         MongoDB (Local or Remote)                   │  │
│  │ Collections:                                        │  │
│  │ - webhooks (webhook configurations)                │  │
│  │ - webhook_logs (request logs)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                 │
                 │ Forwarded requests
                 │ (HTTP, internal network)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│        Your Local Development Application                   │
│        (localhost:3001, 3002, etc.)                         │
│        ✓ Webhook handlers                                   │
│        ✓ Event processing                                   │
│        ✓ Business logic                                     │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Platforms

### Option 1: Vercel (Recommended for Next.js)

**Pros:** ✅ Automatic deployments, free tier, zero-config
**Cons:** ❌ Serverless (may have cold starts), limited to HTTPS

#### Setup:

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Set environment variables in Vercel dashboard
# Go to: Settings → Environment Variables
# Add:
# MONGODB_URI = your_mongodb_connection_string
# NODE_ENV = production
# NEXTAUTH_URL = https://your-app.vercel.app

# 4. Redeploy after setting env vars
vercel --prod
```

#### Configuration (vercel.json):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "MONGODB_URI": "@mongodb_uri"
  },
  "functions": {
    "pages/api/**": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

### Option 2: Railway

**Pros:** ✅ Simple deployment, good free tier, MongoDB included
**Cons:** ❌ Less mature than Vercel

#### Setup:

```bash
# 1. Go to https://railway.app
# 2. Connect GitHub repo
# 3. Create project
# 4. Add MongoDB service
# 5. Set environment variables:
#    - MONGODB_URI (auto-generated)
#    - NODE_ENV=production
# 6. Deploy automatically on push
```

### Option 3: Self-Hosted (VPS)

**Pros:** ✅ Full control, unlimited resources
**Cons:** ❌ Need to manage server, more setup

#### Setup on Ubuntu VPS:

```bash
# 1. SSH into server
ssh root@your-server-ip

# 2. Update system
apt update && apt upgrade -y

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# 4. Install MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  apt-key add -
echo "deb http://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | \
  tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# 5. Install PM2 (process manager)
npm install -g pm2

# 6. Clone repository
cd /opt
git clone your-repo.git webhook-forwarder
cd webhook-forwarder

# 7. Install dependencies and build
npm install
npm run build

# 8. Create .env.local
cat > .env.local << EOF
MONGODB_URI=mongodb://localhost:27017/webhook-forwarder
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
EOF

# 9. Start with PM2
pm2 start "npm start" --name webhook-forwarder
pm2 save
pm2 startup

# 10. Setup Nginx reverse proxy
apt install -y nginx

# 11. Configure Nginx
cat > /etc/nginx/sites-available/webhook-forwarder << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 12. Enable site
ln -s /etc/nginx/sites-available/webhook-forwarder \
      /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 13. Setup SSL with Let's Encrypt
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

#### PM2 Ecosystem File (ecosystem.config.js):

```javascript
module.exports = {
  apps: [
    {
      name: 'webhook-forwarder',
      script: 'npm',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
```

### Option 4: Docker (Any Platform)

**Pros:** ✅ Portable, consistent across environments
**Cons:** ❌ More complex setup

#### Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build app
COPY . .
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
```

#### docker-compose.yml:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/webhook-forwarder
      - NODE_ENV=production
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - mongo
    volumes:
      - ./logs:/app/logs

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

```bash
# Build and run
docker-compose up -d
```

## Performance Optimization

### 1. Database Optimization

```javascript
// Create indexes for faster queries
db.webhooks.createIndex({ webhookId: 1 }, { unique: true })
db.webhooks.createIndex({ createdAt: 1 })
db.webhook_logs.createIndex({ webhookId: 1 })
db.webhook_logs.createIndex({ timestamp: 1 })
db.webhook_logs.createIndex({ statusCode: 1 })
```

### 2. Caching

```javascript
// Add Redis for caching (optional)
import redis from 'redis';

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// Cache webhook lookup
const cachedWebhook = await redisClient.get(`webhook:${webhookId}`);
if (cachedWebhook) return JSON.parse(cachedWebhook);
```

### 3. Log Rotation

```bash
# In production, archive old logs
mongosh << EOF
use webhook-forwarder
db.webhook_logs.deleteMany({
  timestamp: {
    \$lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }
})
EOF
```

### 4. Rate Limiting

```javascript
// Add to pages/api/webhook/[webhookId].js
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute
});

export default limiter(handler);
```

## Security Best Practices

### 1. HTTPS Only

```javascript
// Redirect HTTP to HTTPS
if (req.headers['x-forwarded-proto'] !== 'https') {
  return res.redirect(
    `https://${req.headers.host}${req.url}`
  );
}
```

### 2. API Key Authentication

```javascript
// Add API key validation
export default function handler(req, res) {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Process request
}
```

### 3. Webhook Signature Verification

```javascript
// Verify webhook signatures
import crypto from 'crypto';

function verifySignature(signature, body, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return signature === hash;
}
```

### 4. MongoDB Security

```javascript
// Use MongoDB authentication
// MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
// Enable IP whitelisting in MongoDB Atlas
```

### 5. Environment Variables

```bash
# Never commit sensitive data
# Use .env.local (local development only)
# Use platform-specific env vars in production (Vercel, Railway, etc.)

# Good practices:
# ✓ MONGODB_URI in .env.local (local) / Platform env vars (production)
# ✓ API_KEY different for dev and production
# ✓ Never commit .env files
# ✓ Rotate secrets regularly
```

## Monitoring & Logging

### 1. Application Logging

```javascript
// Create a logging utility
// lib/logger.js
export function logWebhookEvent(webhookId, status, message) {
  console.log(`[${new Date().toISOString()}] [${webhookId}] [${status}] ${message}`);
}
```

### 2. Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
```

```javascript
// pages/_app.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### 3. Health Checks

```bash
# Create a monitoring endpoint
GET /api/health

# Response:
{
  "status": "healthy",
  "mongodb": "connected",
  "uptime": 3600,
  "webhooks_count": 42
}
```

### 4. Metrics Collection

```javascript
// Track key metrics
- Webhooks created per day
- Forwarded requests per day
- Average forwarding time
- Error rate
- Failed forwarding count
```

## Backup Strategy

```bash
# Backup MongoDB Atlas automatically
# Settings → Backup & Restore → Enable automatic backups

# Manual backup
mongodump --uri "mongodb+srv://..." --out /backup

# Restore from backup
mongorestore --uri "mongodb+srv://..." /backup
```

## Scaling Considerations

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Upgrade MongoDB tier

### Horizontal Scaling
- Load balance multiple instances
- Use managed services (Vercel, Railway)
- Implement request queuing for high volume

```javascript
// Add task queue for heavy lifting
import Bull from 'bull';

const webhookQueue = new Bull('webhooks', {
  redis: { host: 'localhost', port: 6379 }
});

webhookQueue.process(async (job) => {
  await forwardWebhook(job.data);
});
```

## Troubleshooting Production Issues

### High Memory Usage
```bash
# Check Node.js memory
ps aux | grep node

# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Slow Webhooks
```bash
# Check MongoDB performance
db.webhook_logs.aggregate([
  {
    $group: {
      _id: "$webhookId",
      avgTime: { $avg: "$processingTime" }
    }
  }
])
```

### Connection Timeouts
```bash
# Increase timeout in axios
axios.defaults.timeout = 30000; // 30 seconds

# Add retry logic
for (let i = 0; i < 3; i++) {
  try {
    return await axios.post(url, data);
  } catch (error) {
    if (i === 2) throw error;
    await sleep(1000 * Math.pow(2, i));
  }
}
```

## Maintenance Checklist

- [ ] Backup MongoDB regularly
- [ ] Monitor disk space
- [ ] Update dependencies monthly (`npm audit`)
- [ ] Review logs for errors
- [ ] Test failover scenarios
- [ ] Update SSL certificates before expiry
- [ ] Archive old logs (>30 days)
- [ ] Monitor costs (especially cloud databases)

---

For more help, check README.md and QUICKSTART.md
