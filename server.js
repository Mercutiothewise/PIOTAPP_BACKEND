const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Database file path
const DB_FILE = path.join(__dirname, 'tickets.json');

// In-memory database fallback (for platforms without persistent storage)
let memoryDB = { tickets: [] };

// Initialize database
function initDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ tickets: [] }, null, 2));
    }
  } catch (err) {
    console.log('Using in-memory database (filesystem not writable)');
  }
}

// Read database
function readDB() {
  try {
    initDatabase();
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.log('Using in-memory database');
    return memoryDB;
  }
}

// Write database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('Saving to in-memory database');
    memoryDB = data;
  }
}

// Get base URL for links in emails
function getBaseUrl() {
  return process.env.BASE_URL || `http://localhost:${PORT}`;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'PUREIOT Support API is running', 
    version: '2.0.0',
    endpoints: {
      submitTicket: 'POST /api/submit-ticket',
      getTickets: 'GET /api/tickets/:userId',
      updateTicket: 'GET /update/:ticketId (web form)',
    }
  });
});

// Submit ticket endpoint
app.post('/api/submit-ticket', async (req, res) => {
  try {
    const { ticketNumber, userName, userEmail, companyName, issue, priority } = req.body;

    // Validate required fields
    if (!ticketNumber || !userName || !userEmail || !issue) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Save ticket to database
    const db = readDB();
    const newTicket = {
      id: ticketNumber,
      ticketNumber,
      userName,
      userEmail,
      companyName: companyName || 'N/A',
      issue,
      priority: priority || 'Medium',
      status: 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    db.tickets.push(newTicket);
    writeDB(db);

    // Send email notification
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@piot.co.za';
    const updateLink = `${getBaseUrl()}/update/${ticketNumber}`;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: supportEmail,
      subject: `New Support Ticket: ${ticketNumber} - ${priority} Priority`,
      html: `
        <h2>New Support Ticket Received</h2>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p><strong>User:</strong> ${userName} (${userEmail})</p>
        <p><strong>Company:</strong> ${companyName || 'N/A'}</p>
        <p><strong>Priority:</strong> ${priority}</p>
        <p><strong>Issue:</strong></p>
        <p>${issue}</p>
        <hr>
        <p><a href="${updateLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Update Ticket Status</a></p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: 'Ticket submitted and email sent',
      ticketNumber 
    });
  } catch (error) {
    console.error('Error submitting ticket:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit ticket',
      error: error.message 
    });
  }
});

// Get tickets by user ID
app.get('/api/tickets/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const db = readDB();
    
    // Filter tickets by userEmail
    const userTickets = db.tickets.filter(ticket => 
      ticket.userEmail === userId || ticket.ticketNumber.includes(userId)
    );

    res.json({ 
      success: true, 
      tickets: userTickets 
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tickets',
      error: error.message 
    });
  }
});

// Web form to update ticket status
app.get('/update/:ticketId', (req, res) => {
  const { ticketId } = req.params;
  const db = readDB();
  const ticket = db.tickets.find(t => t.ticketNumber === ticketId);

  if (!ticket) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket Not Found</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { color: #dc3545; }
        </style>
      </head>
      <body>
        <h1 class="error">Ticket Not Found</h1>
        <p>The ticket ${ticketId} could not be found.</p>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Update Ticket ${ticketId}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .ticket-info {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .ticket-info p { margin: 5px 0; }
        label {
          display: block;
          margin-top: 15px;
          font-weight: bold;
        }
        select, textarea, input {
          width: 100%;
          padding: 10px;
          margin-top: 5px;
          border: 1px solid #ddd;
          border-radius: 5px;
          box-sizing: border-box;
        }
        textarea { min-height: 100px; }
        button {
          background-color: #007bff;
          color: white;
          padding: 12px 30px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 20px;
        }
        button:hover { background-color: #0056b3; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Update Support Ticket</h1>
        <div class="ticket-info">
          <p><strong>Ticket #:</strong> ${ticket.ticketNumber}</p>
          <p><strong>User:</strong> ${ticket.userName}</p>
          <p><strong>Email:</strong> ${ticket.userEmail}</p>
          <p><strong>Company:</strong> ${ticket.companyName}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><strong>Current Status:</strong> ${ticket.status}</p>
          <p><strong>Issue:</strong> ${ticket.issue}</p>
        </div>
        
        <form action="/update/${ticketId}" method="POST">
          <label for="status">Update Status:</label>
          <select name="status" id="status" required>
            <option value="Open" ${ticket.status === 'Open' ? 'selected' : ''}>Open</option>
            <option value="In Progress" ${ticket.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${ticket.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
            <option value="Closed" ${ticket.status === 'Closed' ? 'selected' : ''}>Closed</option>
          </select>

          <label for="notes">Notes (optional):</label>
          <textarea name="notes" id="notes" placeholder="Add any notes about this update..."></textarea>

          <button type="submit">Update Ticket</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Handle ticket update submission
app.post('/update/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, notes } = req.body;

    const db = readDB();
    const ticketIndex = db.tickets.findIndex(t => t.ticketNumber === ticketId);

    if (ticketIndex === -1) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error: Ticket not found</h1>
        </body>
        </html>
      `);
    }

    // Update ticket
    db.tickets[ticketIndex].status = status;
    db.tickets[ticketIndex].updatedAt = new Date().toISOString();
    if (notes) {
      db.tickets[ticketIndex].notes = notes;
    }
    writeDB(db);

    // Send email notification to user
    const ticket = db.tickets[ticketIndex];
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: ticket.userEmail,
      subject: `Ticket Update: ${ticketId} - Status: ${status}`,
      html: `
        <h2>Your Support Ticket Has Been Updated</h2>
        <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
        <p><strong>New Status:</strong> ${status}</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        <hr>
        <p>Thank you for your patience.</p>
        <p>PUREIOT Support Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Update Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          .success { color: #28a745; font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">✓ Ticket Updated Successfully!</h1>
          <p>Ticket <strong>${ticketId}</strong> has been updated to <strong>${status}</strong>.</p>
          <p>An email notification has been sent to ${ticket.userEmail}.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body>
        <h1>Error updating ticket</h1>
        <p>${error.message}</p>
      </body>
      </html>
    `);
  }
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ PIOT Support API running on port ${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/`);
  });
}

module.exports = app;
