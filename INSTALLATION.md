# ✅ WEBHOOK FORWARDER - COMPLETE INSTALLATION GUIDE

## 📦 All Files Created

Your webhook forwarder project contains:

```
webhook-forwarder/
│
├── 📄 Core Files
│   ├── package.json              # NPM dependencies
│   ├── .env.local                # Environment variables (create locally)
│   ├── .gitignore                # Git ignore patterns
│   ├── next.config.js            # Next.js configuration
│
├── 📚 Documentation
│   ├── README.md                 # Complete documentation
│   ├── QUICKSTART.md             # 5-minute quick start guide
│   ├── DEPLOYMENT.md             # Production deployment guide
│   ├── SETUP.sh                  # Setup helper script
│   └── THIS FILE
│
├── 🔌 Backend Code (lib/)
│   ├── mongodb.js                # MongoDB connection & caching
│   ├── webhookService.js         # Webhook CRUD operations
│   └── config.js                 # Configuration & utility functions
│
├── 🌐 API Routes (pages/api/)
│   ├── webhooks.js               # POST (create), GET (list), DELETE
│   └── webhook/
│       ├── [webhookId].js        # POST (forward to localhost)
│       └── [webhookId]/logs.js   # GET (retrieve logs)
│
├── 🎨 Frontend
│   └── pages/index.js            # Dashboard UI (React)
│
└── 🧪 Testing
    └── test-server.js            # Example webhook receiver
```

## 🚀 Installation Steps

### Step 1: Create Project Directory

```bash
mkdir webhook-forwarder
cd webhook-forwarder
```

### Step 2: Copy All Files

Copy all the files you've been provided into the project directory, maintaining the structure shown above.

**Directory structure to create:**

```
webhook-forwarder/
├── lib/
├── pages/
│   └── api/
│       └── webhook/
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Create `.env.local` in the root directory:

```bash
cat > .env.local << EOF
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/webhook-forwarder
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
API_KEY=your-secret-api-key-here
EOF
```

**MongoDB Setup Options:**

**Option A: Free MongoDB Atlas**

- Go to https://www.mongodb.com/cloud/atlas
- Create free account
- Create a cluster
- Get connection string and replace in `.env.local`

**Option B: Local MongoDB**

- Install MongoDB: `brew install mongodb-community` (Mac)
- Start MongoDB: `mongod`
- Use: `MONGODB_URI=mongodb://localhost:27017/webhook-forwarder`

### Step 5: Start Development Server

```bash
npm run dev
```

**Output:**

```
> webhook-forwarder@1.0.0 dev
> next dev

> ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Step 6: Open Dashboard

Visit http://localhost:3000 in your browser

### Step 7: Start Test Server (Optional)

In a new terminal:

```bash
node test-server.js
```

**Output:**

```
🚀 Test Webhook Server running on http://localhost:3001

Webhook endpoints:
  POST http://localhost:3001/webhook
  POST http://localhost:3001/stripe-webhook
  POST http://localhost:3001/github-webhook

Health check: http://localhost:3001/health
```

## 📋 Verify Installation

### Check 1: Dashboard Loads

- Visit http://localhost:3000
- Should see "🚀 Webhook Forwarder" page

### Check 2: API Works

```bash
curl http://localhost:3000/api/webhooks
# Should return: {"success":true,"count":0,"webhooks":[]}
```

### Check 3: Create a Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"localhostPort": 3001, "description": "Test"}'
```

**Success response:**

```json
{
  "success": true,
  "webhook": {
    "webhookId": "abc123def456xyz",
    "forwardingUrl": "http://localhost:3000/api/webhook/abc123def456xyz",
    "localhostPort": 3001,
    "description": "Test"
  }
}
```

### Check 4: Forward a Webhook

```bash
curl -X POST http://localhost:3000/api/webhook/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Should see output in test-server.js terminal:

```
=== WEBHOOK RECEIVED ===
Timestamp: 2024-01-15T10:30:00.000Z
Body: {"test": "data"}
```

## 🎯 Quick Start Workflow

### 1. Create Webhook

```bash
# Via web UI or API
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"localhostPort": 3001, "description": "My App"}'

# Copy the forwardingUrl: http://localhost:3000/api/webhook/abc123...
```

### 2. Configure Third-Party Service

- Stripe: Add webhook endpoint with the forwardingUrl
- GitHub: Add repository webhook with the forwardingUrl
- Custom service: Use the forwardingUrl in your config

### 3. Monitor Webhooks

- View dashboard at http://localhost:3000
- See all webhooks, trigger counts, and logs
- Click "View Logs" to see request details

## 🔄 Development Workflow

### Terminal 1: Webhook Forwarder

```bash
npm run dev
# Runs on http://localhost:3000
```

### Terminal 2: Your Test App

```bash
node test-server.js
# Runs on http://localhost:3001
```

### Terminal 3: Test Webhooks

```bash
# Create webhooks, send requests, check logs
curl -X POST http://localhost:3000/api/webhooks ...
curl -X POST http://localhost:3000/api/webhook/ID ...
curl http://localhost:3000/api/webhook/ID/logs
```

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module 'mongodb'"

**Solution:**

```bash
npm install
```

### Issue: "MONGODB_URI not found"

**Solution:** Check `.env.local` exists and has correct URI:

```bash
cat .env.local  # Should show MONGODB_URI=...
```

### Issue: "Port 3000 already in use"

**Solution:** Kill existing process or use different port:

```bash
# Kill process
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
PORT=3002 npm run dev
```

### Issue: "MongoDB connection error"

**Solution:**

```bash
# Check if MongoDB is running (local)
mongosh

# Or verify MongoDB Atlas:
# - Check connection string in .env.local
# - Check IP whitelist in MongoDB Atlas
# - Check network connectivity
```

### Issue: "Webhook not forwarding"

**Solution:**

```bash
# 1. Verify test server is running
curl http://localhost:3001/health

# 2. Check webhook exists
curl http://localhost:3000/api/webhooks

# 3. Check logs for errors
curl http://localhost:3000/api/webhook/YOUR_ID/logs
```

## 📖 Next Steps

1. **Read Full Documentation**

   ```bash
   cat README.md      # Comprehensive guide
   cat QUICKSTART.md  # 5-minute tutorial
   cat DEPLOYMENT.md  # Production setup
   ```

2. **Test with Real Services**

- Setup Stripe webhook → Forward to localhost
- Setup GitHub webhook → Forward to localhost
- See examples in QUICKSTART.md

3. **Deploy to Production**

- See DEPLOYMENT.md for deployment options
- Vercel (easiest)
- Railway
- Self-hosted VPS
- Docker

4. **Customize for Your Needs**

- Add authentication
- Add rate limiting
- Add webhook signature validation
- Add custom forwarding logic

## 💡 Tips

- **Dashboard is your friend** - Use http://localhost:3000 to see all webhooks and logs
- **API Examples** - Check QUICKSTART.md for curl command examples
- **Test Server** - Run test-server.js to see incoming webhooks
- **Logs are helpful** - Check logs for debugging webhook issues
- **Keep .env.local secure** - Never commit to git (already in .gitignore)

## 🆘 Getting Help

1. **Check Documentation**

- README.md - Full documentation
- QUICKSTART.md - Common scenarios
- DEPLOYMENT.md - Production setup

2. **Check Logs**

- Browser console (press F12)
- Terminal output
- Dashboard webhook logs

3. **Enable Debug Mode**

```bash
DEBUG=* npm run dev
```

4. **Check Example Files**

- test-server.js - Webhook receiver examples
- QUICKSTART.md - API examples
- lib/config.js - Utility functions

## 🎉 You're Ready!

Your webhook forwarder is now set up and ready to use.

**Quick commands:**

```bash
npm install              # Install dependencies
npm run dev             # Start development server
node test-server.js     # Start test webhook receiver
npm run build           # Build for production
npm start               # Run production build
```

**Access:**

- Dashboard: http://localhost:3000
- API: http://localhost:3000/api/\*
- Test Server: http://localhost:3001

**Learn more:** Read README.md, QUICKSTART.md, and DEPLOYMENT.md

Happy webhook forwarding! 🚀

---

## File Checksums (for verification)

If you want to verify all files are copied correctly:

```bash
# Count files
find . -type f | grep -v node_modules | grep -v .next | wc -l

# Expected: 16+ files
```
