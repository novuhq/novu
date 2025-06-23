import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CacheService,
  HttpResponseHeaderKeysEnum,
  Instrument,
  FeatureFlagsService,
  PinoLogger,
} from '@novu/application-generic';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { createHash } from 'crypto';
import { ApiAuthSchemeEnum, FeatureFlagsKeysEnum, UserSessionData } from '@novu/shared';

const IDEMPOTENCY_CACHE_TTL = 60 * 60 * 24; // 24h
const IDEMPOTENCY_PROGRESS_TTL = 60 * 5; // 5min

enum ReqStatusEnum {
  PROGRESS = 'in-progress',
  SUCCESS = 'success',
  ERROR = 'error',
}

export const DOCS_LINK = 'https://docs.novu.co/additional-resources/idempotency';
export const ALLOWED_AUTH_SCHEMES = [ApiAuthSchemeEnum.API_KEY];
const ALLOWED_METHODS = ['post', 'patch'];

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private featureFlagService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  protected async isEnabled(context: ExecutionContext): Promise<boolean> {
    const isAllowedAuthScheme = this.isAllowedAuthScheme(context);
    if (!isAllowedAuthScheme) {
      return true;
    }

    const user = this.getReqUser(context);
    const { organizationId, environmentId, _id } = user;

    return await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_API_IDEMPOTENCY_ENABLED,
      defaultValue: false,
      environment: { _id: environmentId },
      organization: { _id: organizationId },
      user: { _id },
    });
  }

  @Instrument()
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const isAllowedMethod = ALLOWED_METHODS.includes(request.method.toLowerCase());
    const idempotencyKey = this.getIdempotencyKey(context);
    const isEnabled = await this.isEnabled(context);
    if (!idempotencyKey || !isAllowedMethod || !isEnabled) {
      return next.handle();
    }

    if (idempotencyKey?.length > 255) {
      return throwError(
        () =>
          new BadRequestException(
            `idempotencyKey "${idempotencyKey}" has exceeded the maximum allowed length of 255 characters`
          )
      );
    }
    const cacheKey = this.getCacheKey(context);

    try {
      const bodyHash = this.hashRequestBody(request.body);
      // if 1st time we are seeing the request, marks the request as in-progress if not, does nothing
      const isNewReq = await this.setCache(
        cacheKey,
        { status: ReqStatusEnum.PROGRESS, bodyHash },
        IDEMPOTENCY_PROGRESS_TTL,
        true
      );
      // Check if the idempotency key is in the cache
      if (isNewReq) {
        return await this.handleNewRequest(context, next, bodyHash);
      } else {
        return await this.handlerDuplicateRequest(context, bodyHash);
      }
    } catch (err) {
      this.logger.warn(
        `An error occurred while making idempotency check, key:${idempotencyKey}. error: ${err.message}`
      );
      if (err instanceof HttpException) {
        return throwError(() => err);
      }
    }

    // something unexpected happened, both cached response and handler did not execute as expected
    return throwError(() => new ServiceUnavailableException());
  }

  private getIdempotencyKey(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();

    return request.headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLocaleLowerCase()];
  }

  private getReqUser(context: ExecutionContext): UserSessionData {
    const req = context.switchToHttp().getRequest();

    return req.user;
  }

  private isAllowedAuthScheme(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const { authScheme } = req;

    return ALLOWED_AUTH_SCHEMES.some((scheme) => authScheme === scheme);
  }

  private getCacheKey(context: ExecutionContext): string {
    const user = this.getReqUser(context);
    if (user === undefined) {
      const message = 'Cannot build idempotency cache key without user';
      this.logger.error(message);
      throw new InternalServerErrorException(message);
    }
    const env = process.env.NODE_ENV;

    return `${env}-${user.organizationId}-${this.getIdempotencyKey(context)}`;
  }

  async setCache(
    key: string,
    val: { status: ReqStatusEnum; bodyHash: string; data?: any; statusCode?: number },
    ttl: number,
    ifNotExists?: boolean
  ): Promise<string | null> {
    try {
      if (ifNotExists) {
        return await this.cacheService.setIfNotExist(key, JSON.stringify(val), { ttl });
      }
      await this.cacheService.set(key, JSON.stringify(val), { ttl });
    } catch (err) {
      this.logger.warn(`An error occurred while setting idempotency cache, key:${key} error: ${err.message}`);
    }

    return null;
  }

  private setHeaders(response: any, headers: Record<string, string>) {
    // eslint-disable-next-line array-callback-return
    Object.keys(headers).map((key) => {
      if (headers[key]) {
        response.set(key, headers[key]);
      }
    });
  }

  private hashRequestBody(body: object): string {
    const hash = createHash('blake2s256');
    hash.update(Buffer.from(JSON.stringify(body)));

    return hash.digest('hex');
  }

  private async handlerDuplicateRequest(context: ExecutionContext, bodyHash: string): Promise<Observable<any>> {
    const cacheKey = this.getCacheKey(context);
    const idempotencyKey = this.getIdempotencyKey(context)!;
    const data = await this.cacheService.get(cacheKey);
    this.setHeaders(context.switchToHttp().getResponse(), {
      [HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY]: idempotencyKey,
    });
    const parsed = JSON.parse(data);
    if (parsed.status === ReqStatusEnum.PROGRESS) {
      // api call is in progress, so client need to handle this case
      this.logger.trace(`previous api call in progress rejecting the request. key: "${idempotencyKey}"`);
      this.setHeaders(context.switchToHttp().getResponse(), {
        [HttpResponseHeaderKeysEnum.RETRY_AFTER]: `1`,
        [HttpResponseHeaderKeysEnum.LINK]: DOCS_LINK,
      });

      throw new ConflictException(
        `Request with key "${idempotencyKey}" is currently being processed. Please retry after 1 second`
      );
    }
    if (bodyHash !== parsed.bodyHash) {
      // different body sent than before
      this.logger.trace(`idempotency key is being reused for different bodies. key: "${idempotencyKey}"`);
      this.setHeaders(context.switchToHttp().getResponse(), {
        [HttpResponseHeaderKeysEnum.LINK]: DOCS_LINK,
      });

      throw new UnprocessableEntityException(
        `Request with key "${idempotencyKey}" is being reused for a different body`
      );
    }
    this.setHeaders(context.switchToHttp().getResponse(), { [HttpResponseHeaderKeysEnum.IDEMPOTENCY_REPLAY]: 'true' });

    // already seen the request return cached response
    if (parsed.status === ReqStatusEnum.ERROR) {
      this.logger.trace(`returning cached error response. key: "${idempotencyKey}"`);

      throw parsed.data;
    }

    return of(parsed.data);
  }

  private async handleNewRequest(
    context: ExecutionContext,
    next: CallHandler,
    bodyHash: string
  ): Promise<Observable<any>> {
    const cacheKey = this.getCacheKey(context);
    const idempotencyKey = this.getIdempotencyKey(context)!;

    return next.handle().pipe(
      map(async (response) => {
        const httpResponse = context.switchToHttp().getResponse();
        const { statusCode } = httpResponse;

        // Cache the success response and return it
        await this.setCache(
          cacheKey,
          { status: ReqStatusEnum.SUCCESS, bodyHash, statusCode, data: response },
          IDEMPOTENCY_CACHE_TTL
        );
        this.logger.trace(`cached the success response for idempotency key: "${idempotencyKey}"`);
        this.setHeaders(httpResponse, { [HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY]: idempotencyKey });

        return response;
      }),
      catchError((err) => {
        this.setCache(
          cacheKey,
          {
            status: ReqStatusEnum.ERROR,
            bodyHash,
            data: err,
          },
          IDEMPOTENCY_CACHE_TTL
        ).catch(() => {});
        this.logger.trace(`cached the error response for idempotency key: "${idempotencyKey}"`);
        this.setHeaders(context.switchToHttp().getResponse(), {
          [HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY]: idempotencyKey,
        });

        throw err;
      })
    );
  }
}
