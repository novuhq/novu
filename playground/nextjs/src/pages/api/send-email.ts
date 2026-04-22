/**
 * POST /api/send-email
 *
 * Sends a test email via SMTP using nodemailer.
 * SMTP connection is configured via environment variables (see .env.example).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

type RequestBody = {
  to?: string;
  from?: string;
  subject?: string;
  body?: string;
};

type ResponseData = { messageId: string; accepted: string[] } | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });

    return;
  }

  const host = process.env.SMTP_HOST ?? 'localhost';
  const port = parseInt(process.env.SMTP_PORT ?? '1025', 10);
  const user = process.env.SMTP_USER ?? '';
  const pass = process.env.SMTP_PASS ?? '';
  const defaultFrom = process.env.SMTP_FROM ?? 'test@localhost';
  const defaultTo = process.env.SMTP_TO ?? 'recipient@example.com';

  const { to, from, subject, body } = req.body as RequestBody;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false },
  });

  try {
    const info = await transport.sendMail({
      from: from || defaultFrom,
      to: to || defaultTo,
      subject: subject || 'Test email from Novu playground',
      text: body || 'This is a test email sent from the Novu Next.js playground.',
      html: `<p>${body || 'This is a test email sent from the Novu Next.js playground.'}</p>`,
    });

    res.status(200).json({ messageId: info.messageId, accepted: info.accepted as string[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    res.status(500).json({ error: message });
  } finally {
    transport.close();
  }
}
