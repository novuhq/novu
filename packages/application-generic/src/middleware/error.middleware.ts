import {
  Injectable,
  NestInterceptor,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor<T> implements NestInterceptor<T, any> {
  intercept(
    context,
    next: CallHandler
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      catchError((err) =>
        throwError(() => {
          Logger.error(err, context);
          new err();
        })
      )
    );
  }
}
