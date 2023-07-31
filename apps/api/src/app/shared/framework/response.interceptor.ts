import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isObject, isArray } from 'lodash';
import { instanceToPlain } from 'class-transformer';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Response<T> {
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context, next: CallHandler): Observable<Response<T>> {
    if (context.getType() === 'graphql') return next.handle();

    return next.handle().pipe(
      map((data) => {
        if (this.returnWholeObject(data)) {
          return {
            ...data,
            data: isObject(data.data) ? this.transformResponse(data.data) : data.data,
          };
        }

        return {
          data: isObject(data) ? this.transformResponse(data) : data,
        };
      })
    );
  }

  /**
   * This method is used to determine if the entire object should be returned or just the data property
   *   for paginated results that already contain the data wrapper, true.
   *   for single entity result that *could* contain data object, false.
   * @param data
   * @private
   */
  private returnWholeObject(data) {
    const isPaginatedResult = data?.data;
    const isEntityObject = data?._id;

    return isPaginatedResult && !isEntityObject;
  }

  private transformResponse(response) {
    if (isArray(response)) {
      return response.map((item) => this.transformToPlain(item));
    }

    return this.transformToPlain(response);
  }

  private transformToPlain(plainOrClass) {
    return plainOrClass && plainOrClass.constructor !== Object ? instanceToPlain(plainOrClass) : plainOrClass;
  }
}
