import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { CONNECTION_RESULT_CSP, renderConnectionResultPage } from '../../../shared/html/connection-result-page';

export function renderExpiredMcpSetupLinkPage(
  message = 'This setup link is no longer valid. Send a new message to your agent to get a fresh Connect link.'
): string {
  return renderConnectionResultPage({
    status: 'error',
    title: 'Link expired',
    heading: 'This link has expired',
    message,
  });
}

export function sendMcpOAuthResultPage(res: Response, page: string, status = HttpStatus.OK): void {
  res.status(status);
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Security-Policy', CONNECTION_RESULT_CSP);
  res.send(page);
}
