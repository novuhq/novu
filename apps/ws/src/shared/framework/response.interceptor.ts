import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isObject, isArray } from 'lodash';
import { instanceToPlain } from 'class-transformer';

// eslint-disable-next-line
export interface Response<T> {
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context, next: CallHandler): Observable<Response<T>> {
    if (context.getType() === 'graphql') return next.handle();

    return next.handle().pipe(
      map((data) => {
        return {
          data: isObject(data) ? this.transformResponse(data) : data,
        };
      })
    );
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
