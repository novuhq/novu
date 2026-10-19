/**
 * POST /api/send-email
 *
 * Sends a test email via SMTP using nodemailer.
 * SMTP connection is configured via environment variables (see .env.example).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

type AttachmentInput = {
  filename: string;
  contentBase64: string;
  contentType?: string;
};

type RequestBody = {
  to?: string;
  from?: string;
  subject?: string;
  body?: string;
  attachments?: AttachmentInput[];
};

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Base64 JSON is larger than raw bytes; Next default bodyParser limit is 1mb. */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
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

  const { to, from, subject, body, attachments: rawAttachments } = req.body as RequestBody;

  const attachments = Array.isArray(rawAttachments) ? rawAttachments : [];
  let totalBytes = 0;

  for (const att of attachments) {
    if (!att?.filename || typeof att.contentBase64 !== 'string') {
      res.status(400).json({ error: 'Each attachment must have filename and contentBase64' });

      return;
    }

    const approxBytes = Math.ceil((att.contentBase64.length * 3) / 4);
    totalBytes += approxBytes;

    if (approxBytes > MAX_ATTACHMENT_BYTES || totalBytes > MAX_ATTACHMENT_BYTES) {
      res.status(400).json({
        error: `Attachments must be under ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB each and combined`,
      });

      return;
    }
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false },
  });

  try {
    const mailAttachments =
      attachments.length > 0
        ? attachments.map((att) => ({
            filename: att.filename,
            content: att.contentBase64,
            encoding: 'base64' as const,
            ...(att.contentType ? { contentType: att.contentType } : {}),
          }))
        : undefined;

    const info = await transport.sendMail({
      from: from || defaultFrom,
      to: to || defaultTo,
      subject: subject || 'Test email from Novu playground',
      text: body || 'This is a test email sent from the Novu Next.js playground.',
      html: `<p>${body || 'This is a test email sent from the Novu Next.js playground.'}</p>`,
      attachments: mailAttachments,
    });

    res.status(200).json({ messageId: info.messageId, accepted: info.accepted as string[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    res.status(500).json({ error: message });
  } finally {
    transport.close();
  }
}
