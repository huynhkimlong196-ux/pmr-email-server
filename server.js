const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');

const app = express();

// Allow ALL origins (file://, GitHub Pages, localhost, etc.)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors()); // handle preflight for all routes
app.use(express.json({ limit: '15mb' }));

// ── SMTP Transporter ──
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '25'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

// ── Health check ──
app.get('/health', async (req, res) => {
  try {
    await transporter.verify();
    res.json({ ok: true, message: 'SMTP connected successfully', host: process.env.SMTP_HOST });
  } catch(e) {
    // Return ok:true for server health, but note SMTP issue separately
    res.json({ ok: true, smtp: false, smtpError: e.message, message: 'Server online, SMTP error: ' + e.message });
  }
});

// ── Send email ──
app.post('/send', async (req, res) => {
  const { to, cc, subject, html, fromName, fromEmail } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, error: 'Missing: to, subject, html' });
  }
  const senderEmail = fromEmail || process.env.SMTP_USER;
  const senderName  = fromName  || 'Finance Department';
  try {
    const info = await transporter.sendMail({
      from:    `"${senderName}" <${senderEmail}>`,
      to, cc: cc || '', subject, html,
    });
    console.log(`[${new Date().toISOString()}] Sent: ${subject} → ${to}`);
    res.json({ success: true, messageId: info.messageId });
  } catch(e) {
    console.error(`[${new Date().toISOString()}] Error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PMR Email Server running on port ${PORT}`);
  console.log(`SMTP Host: ${process.env.SMTP_HOST || '(not set)'}`);
  console.log(`SMTP User: ${process.env.SMTP_USER || '(not set)'}`);
});
