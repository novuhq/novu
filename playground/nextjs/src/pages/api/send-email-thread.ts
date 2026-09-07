/**
 * POST /api/send-email-thread
 *
 * Sends a simulated email thread (N messages) via SMTP using nodemailer.
 * Each message after the first uses `inReplyTo` and `references` headers to
 * form a proper RFC 2822 thread — no hacks, fully standards-compliant.
 *
 * SMTP connection is configured via environment variables (see .env.example).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

type ThreadMessage = {
  from: string;
  to: string;
  body: string;
};

type RequestBody = {
  subject?: string;
  messages?: ThreadMessage[];
  defaultFrom?: string;
  defaultTo?: string;
};

type SentMessage = {
  messageId: string;
  from: string;
  to: string;
  body: string;
};

type ResponseData = { thread: SentMessage[] } | { error: string };

const DEFAULT_MESSAGES: Omit<ThreadMessage, 'from' | 'to'>[] = [
  { body: 'Hi, I wanted to reach out about the recent update.' },
  { body: 'Thanks for reaching out! Happy to help — what would you like to know?' },
  { body: 'I was wondering about the new inbound email feature. How does it work?' },
];

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
  const envFrom = process.env.SMTP_FROM ?? 'alice@localhost';
  const envTo = process.env.SMTP_TO ?? 'bob@localhost';

  const { subject, messages, defaultFrom, defaultTo } = req.body as RequestBody;

  const resolvedFrom = defaultFrom || envFrom;
  const resolvedTo = defaultTo || envTo;
  const threadSubject = subject || 'Test thread from Novu playground';

  const resolvedMessages: ThreadMessage[] =
    messages && messages.length > 0
      ? messages
      : DEFAULT_MESSAGES.map((m, i) => ({
          ...m,
          from: i % 2 === 0 ? resolvedFrom : resolvedTo,
          to: i % 2 === 0 ? resolvedTo : resolvedFrom,
        }));

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false },
  });

  try {
    const sent: SentMessage[] = [];
    const allMessageIds: string[] = [];

    for (let i = 0; i < resolvedMessages.length; i++) {
      const msg = resolvedMessages[i];
      const isReply = i > 0;
      const replySubject = isReply ? `Re: ${threadSubject}` : threadSubject;
      const prevMessageId = isReply ? allMessageIds[allMessageIds.length - 1] : undefined;

      const info = await transport.sendMail({
        from: msg.from,
        to: msg.to,
        subject: replySubject,
        text: msg.body,
        html: `<p>${msg.body}</p>`,
        ...(isReply && {
          inReplyTo: prevMessageId,
          references: allMessageIds.join(' '),
        }),
      });

      allMessageIds.push(info.messageId);
      sent.push({ messageId: info.messageId, from: msg.from, to: msg.to, body: msg.body });
    }

    res.status(200).json({ thread: sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    res.status(500).json({ error: message });
  } finally {
    transport.close();
  }
}
