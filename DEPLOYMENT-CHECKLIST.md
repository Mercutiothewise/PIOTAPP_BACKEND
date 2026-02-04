# 🚀 Quick Deployment Checklist

## ✅ Files Ready for Deployment

- [x] **server.js** - Complete Express server with all routes
- [x] **api/index.js** - Serverless wrapper for Vercel
- [x] **package.json** - All dependencies listed
- [x] **render.yaml** - Render deployment config
- [x] **vercel.json** - Vercel deployment config
- [x] **.env.example** - Environment variable template
- [x] **.gitignore** - Protects sensitive files

---

## 📋 Backend Features Implemented

### ✅ Mail Service
- Nodemailer configured with SMTP
- Sends email on new ticket submission
- Sends email on ticket status update
- HTML formatted emails with styling

### ✅ Web Form
- GET `/update/:ticketId` - Displays HTML form
- POST `/update/:ticketId` - Handles form submission
- Mobile responsive design
- Shows ticket details before updating

### ✅ API Endpoints
- GET `/` - Health check
- POST `/api/submit-ticket` - Create new ticket
- GET `/api/tickets/:userId` - Get user's tickets
- GET `/update/:ticketId` - Web form to update ticket
- POST `/update/:ticketId` - Submit ticket update

---

## 🎯 Choose Your Hosting Platform

### Option 1: Render (Recommended)
**Best for:** Production apps with persistent storage

**Pros:**
- ✅ Free tier available
- ✅ Persistent file storage (tickets.json works)
- ✅ Easy environment variables
- ✅ Auto-deploys from GitHub
- ✅ Built-in SSL

**Quick Start:**
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. "New +" → "Web Service"
4. Connect GitHub repo
5. Select `piot-backend-upload` folder
6. Add environment variables
7. Deploy!

**Deployment time:** ~5 minutes

---

### Option 2: Vercel
**Best for:** Fast API deployments, serverless

**Pros:**
- ✅ Very fast deployments
- ✅ Great free tier
- ✅ Easy CLI deployment

**Cons:**
- ⚠️ No persistent storage (need external DB)

**Quick Start:**
```bash
npm install -g vercel
cd piot-backend-upload
vercel login
vercel
# Add environment variables in dashboard
vercel --prod
```

**Deployment time:** ~2 minutes

---

### Option 3: Firebase
**Best for:** Google Cloud integration

**Quick Start:**
```bash
npm install -g firebase-tools
firebase login
firebase init functions
# Follow the setup wizard
firebase deploy --only functions
```

**Deployment time:** ~3 minutes

---

## 🔑 Environment Variables You MUST Set

No matter which platform, set these:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SUPPORT_EMAIL=support@piot.co.za
BASE_URL=https://your-deployed-url.com
```

---

## 📧 Getting Email Credentials

### Gmail Setup (5 minutes):
1. Go to Google Account → Security
2. Enable 2-Factor Authentication
3. Create App Password for "Mail"
4. Use that password as `SMTP_PASS`

### Alternative SMTP Providers:
- **SendGrid**: 100 emails/day free
- **Mailgun**: 5,000 emails/month free
- **AWS SES**: Very cheap, reliable

---

## 🧪 Test After Deployment

### 1. Test Health Check
```bash
curl https://your-app.com/
```

Should return JSON with status

### 2. Test Ticket Submission
```bash
curl -X POST https://your-app.com/api/submit-ticket \
  -H "Content-Type: application/json" \
  -d '{"ticketNumber":"TEST-001","userName":"Test","userEmail":"test@test.com","issue":"Test"}'
```

Should send email and return success

### 3. Test Web Form
Open: `https://your-app.com/update/TEST-001`

Should show HTML form

---

## ⚡ Ready to Deploy in 5 Minutes!

**Fastest Path (Render):**
1. Set up GitHub repo (if not already)
2. Go to render.com
3. Connect repo
4. Add 6 environment variables
5. Deploy!

**Your URL:** `https://piot-support-api.onrender.com`

---

## 📊 What Happens After Deployment

1. **New ticket submitted** → Email sent to SUPPORT_EMAIL
2. **Support clicks email link** → Opens web form
3. **Support updates status** → Email sent to user
4. **User checks app** → Sees updated ticket status

---

## 🆘 Need Help?

Check [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Detailed step-by-step guides
- Troubleshooting tips
- Security best practices
- Monitoring setup

---

## ✨ Your Backend is Ready!

All code is complete and tested. Just:
1. Choose platform
2. Set environment variables
3. Deploy
4. Test

**No code changes needed!** 🎉
