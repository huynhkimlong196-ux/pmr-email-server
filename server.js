const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); // allow large HTML email bodies

// ── SMTP Transporter (configured via Environment Variables on Render) ──
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,            // e.g. mail.handongec.co.kr
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,            // e.g. long.hk@handongec.co.kr
    pass: process.env.SMTP_PASS,            // email password
  },
  tls: {
    rejectUnauthorized: false,              // allow self-signed certs (common in corporate)
  },
});

// ── Health check endpoint ──
app.get('/health', async (req, res) => {
  try {
    await transporter.verify();
    res.json({ ok: true, message: 'SMTP connected successfully' });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Send email endpoint ──
app.post('/send', async (req, res) => {
  const { to, cc, subject, html, fromName, fromEmail } = req.body;

  // Basic validation
  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, subject, html' });
  }

  const senderEmail = fromEmail || process.env.SMTP_USER;
  const senderName  = fromName  || 'Finance Department';

  try {
    const info = await transporter.sendMail({
      from:    `"${senderName}" <${senderEmail}>`,
      to:      to,
      cc:      cc || '',
      subject: subject,
      html:    html,
    });

    console.log(`[${new Date().toISOString()}] Sent: ${subject} → ${to}`);
    res.json({ success: true, messageId: info.messageId });

  } catch(e) {
    console.error(`[${new Date().toISOString()}] Error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Start server ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PMR Email Server running on port ${PORT}`);
  console.log(`SMTP Host: ${process.env.SMTP_HOST || '(not set)'}`);
  console.log(`SMTP User: ${process.env.SMTP_USER || '(not set)'}`);
});
