const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase (optional)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

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

function mapStatusToSupabase(status) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'open') return 'submitted';
  if (normalized === 'in progress') return 'in_progress';
  if (normalized === 'resolved') return 'completed';
  if (normalized === 'closed') return 'closed';
  return 'submitted';
}

function mapStatusFromSupabase(status) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'submitted') return 'Open';
  if (normalized === 'assigned') return 'In Progress';
  if (normalized === 'in_progress') return 'In Progress';
  if (normalized === 'completed') return 'Resolved';
  if (normalized === 'closed') return 'Closed';
  return 'Open';
}

async function getTicketFromSupabase(ticketId) {
  if (!supabase) return null;

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(`
      *,
      user:profiles(*),
      company:companies(name)
    `)
    .eq('ticket_number', ticketId)
    .single();

  if (error || !ticket) return null;

  const { data: comments } = await supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true });

  return {
    id: ticket.ticket_number,
    ticketNumber: ticket.ticket_number,
    userName: `${ticket.user?.first_name || ''} ${ticket.user?.surname || ''}`.trim(),
    userEmail: ticket.user?.email || '',
    userPhone: ticket.user?.phone || 'N/A',
    anyDeskId: ticket.user?.anydesk_id || 'N/A',
    companyName: ticket.company?.name || 'N/A',
    issue: ticket.description || ticket.subject || '',
    priority: ticket.priority || 'Medium',
    contactPreference: ticket.contact_preference || 'asap',
    scheduledTime: ticket.scheduled_time || '',
    status: mapStatusFromSupabase(ticket.status),
    comments: (comments || []).map(c => ({
      text: c.text,
      author: c.author_name,
      createdAt: c.created_at,
    })),
    _supabaseId: ticket.id,
  };
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resend email client
const resend = new Resend(process.env.RESEND_API_KEY);

function getFromEmail() {
  return process.env.RESEND_FROM || process.env.SUPPORT_EMAIL || 'onboarding@resend.dev';
}

async function sendEmail({ to, subject, html }) {
  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject,
    html,
  });
}

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
    const {
      ticketNumber,
      userName,
      userEmail,
      userPhone,
      companyName,
      issue,
      priority,
      contactPreference,
      scheduledTime,
      anyDeskId,
    } = req.body;

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
      userPhone: userPhone || 'N/A',
      anyDeskId: anyDeskId || 'N/A',
      companyName: companyName || 'N/A',
      issue,
      priority: priority || 'Medium',
      contactPreference: contactPreference || 'asap',
      scheduledTime: scheduledTime || '',
      status: 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    };
    
    db.tickets.push(newTicket);
    writeDB(db);

    // Send email notification
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@piot.co.za';
    const updateLink = `${getBaseUrl()}/update/${ticketNumber}`;

    const mailOptions = {
      to: supportEmail,
      subject: `New Support Ticket: ${ticketNumber} - ${priority} Priority`,
      html: `
        <h2>New Support Ticket Received</h2>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p><strong>User:</strong> ${userName} (${userEmail})</p>
        <p><strong>Phone:</strong> ${userPhone || 'N/A'}</p>
        <p><strong>AnyDesk ID:</strong> ${anyDeskId || 'N/A'}</p>
        <p><strong>Company:</strong> ${companyName || 'N/A'}</p>
        <p><strong>Priority:</strong> ${priority}</p>
        <p><strong>Preferred Contact:</strong> ${contactPreference || 'asap'} ${scheduledTime ? `(${scheduledTime})` : ''}</p>
        <p><strong>Issue:</strong></p>
        <p>${issue}</p>
        <hr>
        <p><a href="${updateLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Update Ticket Status</a></p>
      `,
    };

    await sendEmail(mailOptions);

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
app.get('/update/:ticketId', async (req, res) => {
  const { ticketId } = req.params;
  const supaTicket = await getTicketFromSupabase(ticketId);
  const db = readDB();
  const localTicket = db.tickets.find(t => t.ticketNumber === ticketId);
  const ticket = supaTicket || localTicket;

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
          <p><strong>Phone:</strong> ${ticket.userPhone || 'N/A'}</p>
          <p><strong>AnyDesk ID:</strong> ${ticket.anyDeskId || 'N/A'}</p>
          <p><strong>Company:</strong> ${ticket.companyName}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><strong>Preferred Contact:</strong> ${ticket.contactPreference || 'asap'} ${ticket.scheduledTime ? `(${ticket.scheduledTime})` : ''}</p>
          <p><strong>Current Status:</strong> ${ticket.status}</p>
          <p><strong>Issue:</strong> ${ticket.issue}</p>
        </div>

        <div class="ticket-info">
          <p><strong>Comments:</strong></p>
          ${(ticket.comments || []).length === 0
            ? '<p>No comments yet.</p>'
            : (ticket.comments || []).map(c => `
                <p><strong>${c.author || 'Support'}:</strong> ${c.text} <em>(${new Date(c.createdAt).toLocaleString()})</em></p>
              `).join('')}
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

    let ticket = null;
    const supaTicket = await getTicketFromSupabase(ticketId);

    if (supaTicket && supabase) {
      const supabaseStatus = mapStatusToSupabase(status);
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ status: supabaseStatus, updated_at: new Date().toISOString() })
        .eq('id', supaTicket._supabaseId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        return res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error updating ticket</h1>
            <p>${updateError.message}</p>
          </body>
          </html>
        `);
      }

      if (notes) {
        const { error: commentError } = await supabase
          .from('ticket_comments')
          .insert({
            ticket_id: supaTicket._supabaseId,
            author_name: 'Support',
            text: notes,
            is_from_user: false,
          });

        if (commentError) {
          console.error('Supabase comment error:', commentError);
        }
      }

      ticket = supaTicket;
      ticket.status = status;
    }

    // Local DB fallback (kept for compatibility)
    const db = readDB();
    const ticketIndex = db.tickets.findIndex(t => t.ticketNumber === ticketId);
    if (ticketIndex !== -1) {
      db.tickets[ticketIndex].status = status;
      db.tickets[ticketIndex].updatedAt = new Date().toISOString();
      if (notes) {
        db.tickets[ticketIndex].notes = notes;
        const existingComments = db.tickets[ticketIndex].comments || [];
        existingComments.push({
          text: notes,
          author: 'Support',
          createdAt: new Date().toISOString(),
        });
        db.tickets[ticketIndex].comments = existingComments;
      }
      writeDB(db);
      if (!ticket) ticket = db.tickets[ticketIndex];
    }

    if (!ticket) {
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

    // Send email notification to user
    const mailOptions = {
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

    await sendEmail(mailOptions);

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
