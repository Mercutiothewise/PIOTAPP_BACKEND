# PIOT Support Backend - Deployment Guide

## ✅ Pre-Deployment Checklist

Your backend includes:
- ✅ **Mail Service**: Nodemailer with SMTP configuration
- ✅ **Web Form**: HTML form for updating ticket status
- ✅ **API Endpoints**: REST API for ticket management
- ✅ **Database**: Simple JSON file storage (tickets.json)

---

## 📋 Required Environment Variables

Set these on your hosting platform:

```env
SMTP_HOST=smtp.gmail.com          # Your SMTP server
SMTP_PORT=587                      # SMTP port (587 for TLS)
SMTP_USER=your-email@gmail.com    # Your email address
SMTP_PASS=your-app-password       # Email app password
SUPPORT_EMAIL=support@piot.co.za  # Where tickets are sent
BASE_URL=https://your-app.com     # Your deployment URL
PORT=3001                          # Optional (auto-set on most platforms)
NODE_ENV=production                # Optional
```

### 📧 Getting SMTP Credentials

**For Gmail:**
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Generate an app password for "Mail"
5. Use this as `SMTP_PASS`

**For Outlook/Office 365:**
- SMTP_HOST: `smtp-mail.outlook.com` or `smtp.office365.com`
- SMTP_PORT: `587`

---

## 🚀 Deployment Options

### Option 1: Render.com (Recommended for Full Node.js Apps)

**Advantages:**
- ✅ Persistent storage for tickets.json
- ✅ Free tier available
- ✅ Easy environment variable management
- ✅ Automatic SSL

**Steps:**

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Connect Repository**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `piot-backend-upload` folder

3. **Configure Service**
   ```
   Name: piot-support-api
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Add Environment Variables**
   - Go to "Environment" tab
   - Add all variables from the list above
   - Set `BASE_URL` to your Render URL (e.g., https://piot-support-api.onrender.com)

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (3-5 minutes)
   - Test at: https://your-app.onrender.com/

**Note:** The `render.yaml` file is already configured. Render will auto-detect it.

---

### Option 2: Vercel (Serverless)

**Advantages:**
- ✅ Very fast deployments
- ✅ Free tier with good limits
- ✅ Great for API endpoints

**Limitations:**
- ⚠️ No persistent file storage (tickets.json won't persist between deployments)
- ⚠️ Need external database for production (Supabase/MongoDB)

**Steps:**

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from piot-backend-upload folder**
   ```bash
   cd piot-backend-upload
   vercel
   ```

4. **Add Environment Variables**
   ```bash
   vercel env add SMTP_HOST
   vercel env add SMTP_PORT
   vercel env add SMTP_USER
   vercel env add SMTP_PASS
   vercel env add SUPPORT_EMAIL
   vercel env add BASE_URL
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

**Note:** The `vercel.json` file is already configured.

---

### Option 3: Firebase Cloud Functions

**Advantages:**
- ✅ Google infrastructure
- ✅ Integrated with Firebase services
- ✅ Free tier available

**Steps:**

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project**
   ```bash
   cd piot-backend-upload
   firebase init functions
   ```
   - Select "Use an existing project" or create new
   - Choose JavaScript
   - Install dependencies: Yes

4. **Modify functions/index.js**
   ```javascript
   const functions = require('firebase-functions');
   const app = require('../server');
   
   exports.api = functions.https.onRequest(app);
   ```

5. **Set Environment Variables**
   ```bash
   firebase functions:config:set \
     smtp.host="smtp.gmail.com" \
     smtp.port="587" \
     smtp.user="your-email@gmail.com" \
     smtp.pass="your-app-password" \
     support.email="support@piot.co.za"
   ```

6. **Deploy**
   ```bash
   firebase deploy --only functions
   ```

**Access URL:** `https://us-central1-YOUR-PROJECT.cloudfunctions.net/api`

---

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-deployed-url.com/
```

Expected response:
```json
{
  "status": "PUREIOT Support API is running",
  "version": "2.0.0",
  "endpoints": {
    "submitTicket": "POST /api/submit-ticket",
    "getTickets": "GET /api/tickets/:userId",
    "updateTicket": "GET /update/:ticketId (web form)"
  }
}
```

### 2. Submit Test Ticket
```bash
curl -X POST https://your-deployed-url.com/api/submit-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticketNumber": "TEST-001",
    "userName": "Test User",
    "userEmail": "test@example.com",
    "companyName": "Test Company",
    "issue": "Test issue",
    "priority": "Low"
  }'
```

### 3. Test Web Form
Open in browser: `https://your-deployed-url.com/update/TEST-001`

---

## 🔧 Troubleshooting

### Email Not Sending
- Check SMTP credentials are correct
- For Gmail, ensure App Password is used (not regular password)
- Check spam folder
- Verify SMTP_HOST and SMTP_PORT

### 500 Internal Server Error
- Check server logs on your hosting platform
- Verify all environment variables are set
- Check if SMTP connection is successful

### Tickets Not Persisting (Vercel)
- This is expected with serverless functions
- Consider using Supabase for database storage
- Modify code to use external database instead of tickets.json

---

## 🔄 Updating Your Deployment

**Render:**
- Push changes to GitHub
- Render auto-deploys from main branch

**Vercel:**
```bash
vercel --prod
```

**Firebase:**
```bash
firebase deploy --only functions
```

---

## 📊 Monitoring

- **Render**: Check "Logs" tab in dashboard
- **Vercel**: Check "Deployments" and "Functions" tabs
- **Firebase**: Check Firebase Console → Functions

---

## 🔐 Security Best Practices

1. ✅ Never commit `.env` file to Git
2. ✅ Use strong SMTP passwords
3. ✅ Use environment variables for all secrets
4. ✅ Enable CORS only for your app domain (update in server.js)
5. ✅ Consider rate limiting for production

---

## 📞 Support

For issues with:
- **Backend Code**: Check [server.js](./server.js)
- **Email Config**: Check [.env.example](./.env.example)
- **Deployment**: Check hosting platform docs

---

## ✅ What's Included

Your backend is fully configured with:
- ✅ Email service (Nodemailer)
- ✅ Web form for ticket updates
- ✅ REST API endpoints
- ✅ CORS enabled
- ✅ Error handling
- ✅ Environment variable support
- ✅ Health check endpoint
- ✅ Deployment configs (Render, Vercel)

**Ready to deploy!** 🚀
