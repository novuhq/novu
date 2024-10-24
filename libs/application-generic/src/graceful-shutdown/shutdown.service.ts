import { Injectable } from '@nestjs/common';

@Injectable()
export class ShutdownService {
  public readonly timeout =
    parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT, 10) || 5000;
}
