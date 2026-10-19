import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { InternalId, parseSlugId } from './parse-slug-id';

@Injectable()
export class ParseSlugIdPipe implements PipeTransform<string, InternalId> {
  transform(value: string, metadata: ArgumentMetadata): InternalId {
    return parseSlugId(value);
  }
}
