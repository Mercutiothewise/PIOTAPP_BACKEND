# Local Testing Guide

## 🧪 Test Your Backend Locally Before Deployment

### 1. Install Dependencies
```bash
cd piot-backend-upload
npm install
```

### 2. Create .env File
```bash
# Copy the example file
cp .env.example .env
```

Then edit `.env` with your actual credentials:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-real-email@gmail.com
SMTP_PASS=your-app-password
SUPPORT_EMAIL=support@piot.co.za
BASE_URL=http://localhost:3001
PORT=3001
```

### 3. Start the Server
```bash
npm start
```

You should see:
```
✓ PIOT Support API running on port 3001
✓ Health check: http://localhost:3001/
```

### 4. Test Endpoints

#### A. Health Check
Open browser: http://localhost:3001/

Should show:
```json
{
  "status": "PUREIOT Support API is running",
  "version": "2.0.0",
  "endpoints": { ... }
}
```

#### B. Submit Ticket (PowerShell)
```powershell
$body = @{
    ticketNumber = "TEST-$(Get-Random -Maximum 1000)"
    userName = "Michael"
    userEmail = "michael@piot.co.za"
    companyName = "PUREIOT"
    issue = "Testing the ticket system"
    priority = "Medium"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/submit-ticket" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

Should return:
```json
{
  "success": true,
  "message": "Ticket submitted and email sent",
  "ticketNumber": "TEST-XXX"
}
```

**Check your SUPPORT_EMAIL inbox!**

#### C. Test Web Form
1. Note the ticket number from step B (e.g., TEST-123)
2. Open browser: http://localhost:3001/update/TEST-123
3. Change status to "In Progress"
4. Add notes: "Working on this now"
5. Click "Update Ticket"
6. Check the user email inbox for notification

#### D. Get Tickets
Open browser: http://localhost:3001/api/tickets/michael@piot.co.za

Should show all tickets for that user.

---

## 🐛 Troubleshooting

### Error: "Invalid login"
- Check your SMTP_USER and SMTP_PASS
- For Gmail, make sure you're using an App Password, not your regular password
- Go to: https://myaccount.google.com/apppasswords

### Error: "connect ECONNREFUSED"
- Check your SMTP_HOST and SMTP_PORT
- Make sure your internet connection is working
- Try pinging the SMTP server

### No email received
- Check spam folder
- Verify SUPPORT_EMAIL is correct
- Check server console for errors

### Port already in use
```bash
# Change PORT in .env file
PORT=3002
```

---

## 📋 Test Checklist

- [ ] Server starts without errors
- [ ] Health check returns JSON
- [ ] Submit ticket sends email to support
- [ ] Web form displays correctly
- [ ] Updating ticket sends email to user
- [ ] tickets.json file is created
- [ ] All endpoints return proper responses

---

## ✅ Once All Tests Pass

Your backend is ready to deploy!

Choose your platform:
- **Render**: See [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)
- **Vercel**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Firebase**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🔄 Development Tips

### Auto-restart on changes (optional)
```bash
npm install --save-dev nodemon
```

Update package.json:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

Then use:
```bash
npm run dev
```

### View tickets.json
```bash
cat tickets.json
```

### Clear all tickets (reset)
```bash
del tickets.json
```
Server will recreate it on next request.

---

## 📞 Need Help?

If tests fail, check:
1. .env file has correct values
2. No typos in SMTP credentials
3. Gmail App Password (not regular password)
4. Internet connection is working
5. No firewall blocking port 3001

Happy testing! 🚀
