import * as dns from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import { BadRequestException, Injectable } from '@nestjs/common';
import { assertSafeOutboundUrl, isPrivateIp, PinoLogger, SsrfBlockedError } from '@novu/application-generic';
import type { FileRef, ReplyContentDto } from '../../shared/dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

export type ChatSdkFile = Omit<FileRef, 'data'> & { data?: Buffer };
export type ChatSdkReplyContent = Omit<ReplyContentDto, 'files'> & { files?: ChatSdkFile[] };

type MaterializedFile = ChatSdkFile & { size: number; source: 'data' | 'url' };
type PinnedFileResponse = {
  status: number;
  statusText: string;
  headers: http.IncomingHttpHeaders;
  data: Buffer;
};

const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;
const MAX_INLINE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_INLINE_AGGREGATE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES_PER_MESSAGE = 15;
const MAX_AGGREGATE_FILE_BYTES = 50 * 1024 * 1024;
const MAX_INLINE_FILE_BASE64_CHARS = 7_000_000;
const FILE_FETCH_TIMEOUT_MS = 10_000;
const MAX_FILE_FETCH_REDIRECTS = 3;
const SUPPORTED_FILE_PLATFORMS = new Set<string>([
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.TEAMS,
  AgentPlatformEnum.WHATSAPP,
]);
const UNSUPPORTED_FILE_PLATFORMS = new Set<string>([AgentPlatformEnum.EMAIL]);

@Injectable()
export class FileMaterializer {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  async prepareContentForDelivery(
    content: ReplyContentDto,
    platform: string = AgentPlatformEnum.SLACK,
    agentId?: string
  ): Promise<ChatSdkReplyContent> {
    if (!content.files?.length) {
      return content as ChatSdkReplyContent;
    }

    if (UNSUPPORTED_FILE_PLATFORMS.has(platform)) {
      this.logger.warn(
        {
          agentId,
          platform,
          droppedCount: content.files.length,
        },
        'Dropping outbound agent files because platform does not support attachments'
      );

      const { files: _files, ...withoutFiles } = content;

      return withoutFiles as ChatSdkReplyContent;
    }

    if (!SUPPORTED_FILE_PLATFORMS.has(platform)) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `File attachments are not supported on platform "${platform}".`,
      });
    }

    if (content.files.length > MAX_FILES_PER_MESSAGE) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Too many attachments: maximum is ${MAX_FILES_PER_MESSAGE} files per message.`,
      });
    }

    const files: ChatSdkFile[] = [];
    let aggregateSize = 0;
    let inlineAggregateSize = 0;

    for (const [index, file] of content.files.entries()) {
      const materialized = await this.prepareFileForDelivery(file, index);
      aggregateSize += materialized.size;
      if (materialized.source === 'data') {
        inlineAggregateSize += materialized.size;
      }

      if (aggregateSize > MAX_AGGREGATE_FILE_BYTES) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Total attachment size exceeds ${this.formatBytes(MAX_AGGREGATE_FILE_BYTES)}.`,
        });
      }

      if (inlineAggregateSize > MAX_INLINE_AGGREGATE_FILE_BYTES) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Total inline attachment size exceeds ${this.formatBytes(MAX_INLINE_AGGREGATE_FILE_BYTES)}. Use URLs for larger files.`,
        });
      }

      const { size: _size, source: _source, ...chatSdkFile } = materialized;
      files.push(chatSdkFile);
    }

    return {
      ...content,
      files,
    };
  }

  private async prepareFileForDelivery(file: FileRef, index: number): Promise<MaterializedFile> {
    const data = (file as { data?: unknown }).data;
    const url = (file as { url?: unknown }).url;

    if (data !== undefined && data !== null) {
      if (typeof data !== 'string') {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Invalid file ${this.describeFile(file, index)}: data must be a base64-encoded string.`,
        });
      }

      const buffer = this.decodeBase64FileData(data, file, index);
      const { url: _url, ...fileWithoutUrl } = file;

      return {
        ...fileWithoutUrl,
        data: buffer,
        size: buffer.length,
        source: 'data',
      };
    }

    if (typeof url !== 'string') {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)}: provide a public HTTP(S) url or base64 data.`,
      });
    }

    const fetched = await this.fetchFileUrl(url, file, index);
    const { url: _url, ...fileWithoutUrl } = file;

    return {
      ...fileWithoutUrl,
      data: fetched.data,
      mimeType: file.mimeType || fetched.mimeType,
      size: fetched.data.length,
      source: 'url',
    };
  }

  private decodeBase64FileData(data: string, file: FileRef, index: number): Buffer {
    const normalized = data.replace(/\s/g, '');
    const remainder = normalized.length % 4;

    if (normalized.length > MAX_INLINE_FILE_BASE64_CHARS) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)}: inline data must be ${this.formatBytes(MAX_INLINE_FILE_BYTES)} or smaller.`,
      });
    }

    if (!normalized || remainder === 1 || !BASE64_REGEX.test(normalized)) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)}: data must be a base64-encoded string.`,
      });
    }

    const padded = remainder === 0 ? normalized : normalized.padEnd(normalized.length + (4 - remainder), '=');
    const buffer = Buffer.from(padded, 'base64');

    if (buffer.toString('base64').replace(/=+$/, '') !== normalized.replace(/=+$/, '')) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)}: data must be a base64-encoded string.`,
      });
    }

    if (buffer.length > MAX_INLINE_FILE_BYTES) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)}: inline data must be ${this.formatBytes(MAX_INLINE_FILE_BYTES)} or smaller.`,
      });
    }

    return buffer;
  }

  private async fetchFileUrl(url: string, file: FileRef, index: number): Promise<{ data: Buffer; mimeType?: string }> {
    const response = await this.fetchValidatedFileUrl(url, file, index);

    if (response.status < 200 || response.status >= 300) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Failed to fetch file ${this.describeFile(file, index)}: ${response.status} ${response.statusText}`,
      });
    }

    const contentLength = this.getHeader(response.headers, 'content-length');
    if (contentLength) {
      const size = Number(contentLength);
      if (Number.isFinite(size) && size > MAX_FILE_BYTES) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Invalid file ${this.describeFile(file, index)}: file size exceeds ${this.formatBytes(MAX_FILE_BYTES)}.`,
        });
      }
    }

    const data = response.data;
    const mimeType = this.getHeader(response.headers, 'content-type');

    return { data, mimeType };
  }

  private async fetchValidatedFileUrl(url: string, file: FileRef, index: number): Promise<PinnedFileResponse> {
    let currentUrl = url;

    for (let redirectCount = 0; redirectCount <= MAX_FILE_FETCH_REDIRECTS; redirectCount += 1) {
      const ssrfError = await this.validateFileUrl(currentUrl);
      if (ssrfError) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Invalid file ${this.describeFile(file, index)} url: ${ssrfError}`,
        });
      }

      let response: PinnedFileResponse;
      try {
        response = await this.requestPinnedFileUrl(currentUrl, file, index);
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }

        const message = err instanceof Error ? err.message : String(err);
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Failed to fetch file ${this.describeFile(file, index)}: ${message}`,
        });
      }

      if (response.status < 300 || response.status >= 400) {
        return response;
      }

      const location = this.getHeader(response.headers, 'location');
      if (!location) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Failed to fetch file ${this.describeFile(file, index)}: redirect response missing Location header.`,
        });
      }

      currentUrl = new URL(location, currentUrl).toString();
    }

    throw new BadRequestException({
      error: 'attachment_failed',
      message: `Failed to fetch file ${this.describeFile(file, index)}: too many redirects.`,
    });
  }

  private async validateFileUrl(url: string): Promise<string | null> {
    try {
      assertSafeOutboundUrl(url);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        return err.message;
      }
      throw err;
    }

    return null;
  }

  private async requestPinnedFileUrl(url: string, file: FileRef, index: number): Promise<PinnedFileResponse> {
    const parsed = new URL(url);
    const address = await this.resolvePublicAddress(parsed, file, index);
    const client = parsed.protocol === 'https:' ? https : http;

    return await new Promise((resolve, reject) => {
      const request = client.request(
        {
          protocol: parsed.protocol,
          hostname: address.address,
          family: address.family,
          port: parsed.port || undefined,
          path: `${parsed.pathname}${parsed.search}`,
          method: 'GET',
          headers: { Host: parsed.host },
          servername: parsed.hostname,
          timeout: FILE_FETCH_TIMEOUT_MS,
        },
        (response) => {
          const status = response.statusCode ?? 0;
          const statusText = response.statusMessage ?? '';

          if (status >= 300 && status < 400) {
            response.resume();
            resolve({ status, statusText, headers: response.headers, data: Buffer.alloc(0) });

            return;
          }

          const contentLength = this.getHeader(response.headers, 'content-length');
          if (contentLength) {
            const size = Number(contentLength);
            if (Number.isFinite(size) && size > MAX_FILE_BYTES) {
              response.destroy();
              reject(
                new BadRequestException({
                  error: 'attachment_failed',
                  message: `Invalid file ${this.describeFile(file, index)}: file size exceeds ${this.formatBytes(MAX_FILE_BYTES)}.`,
                })
              );

              return;
            }
          }

          const chunks: Buffer[] = [];
          let total = 0;

          response.on('data', (chunk: Buffer) => {
            total += chunk.length;
            if (total > MAX_FILE_BYTES) {
              response.destroy(
                new BadRequestException({
                  error: 'attachment_failed',
                  message: `Invalid file ${this.describeFile(file, index)}: file size exceeds ${this.formatBytes(MAX_FILE_BYTES)}.`,
                })
              );

              return;
            }

            chunks.push(chunk);
          });
          response.on('end', () =>
            resolve({ status, statusText, headers: response.headers, data: Buffer.concat(chunks, total) })
          );
          response.on('error', reject);
        }
      );

      request.on('timeout', () => request.destroy(new Error('Request timed out')));
      request.on('error', reject);
      request.end();
    });
  }

  private async resolvePublicAddress(parsed: URL, file: FileRef, index: number): Promise<dns.LookupAddress> {
    let addresses: dns.LookupAddress[];
    try {
      addresses = await dns.promises.lookup(parsed.hostname, { all: true });
    } catch {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)} url: Unable to resolve hostname "${parsed.hostname}".`,
      });
    }

    if (!addresses.length) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)} url: Unable to resolve hostname "${parsed.hostname}".`,
      });
    }

    for (const { address } of addresses) {
      if (isPrivateIp(address)) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Invalid file ${this.describeFile(file, index)} url: Requests to private or reserved IP addresses are not allowed (resolved: ${address}).`,
        });
      }
    }

    return addresses[0];
  }

  private getHeader(headers: http.IncomingHttpHeaders, name: string): string | undefined {
    const value = headers[name.toLowerCase()];

    return Array.isArray(value) ? value[0] : value;
  }

  private describeFile(file: FileRef, index: number): string {
    return file.filename ? `"${file.filename}"` : `at index ${index}`;
  }

  private formatBytes(bytes: number): string {
    return `${Math.floor(bytes / (1024 * 1024))} MB`;
  }
}
