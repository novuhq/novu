import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { BaseRepository } from '@novu/dal';
import { decodeBase62 } from '../../shared/helpers';

type InternalId = string;
const INTERNAL_ID_LENGTH = 24;
const ENCODED_ID_LENGTH = 16;

function isWorkflowId(value: string) {
  return value.length < ENCODED_ID_LENGTH;
}

function isInternalId(value: string) {
  return BaseRepository.isInternalId(value) && value.length === INTERNAL_ID_LENGTH;
}

function lookoutForId(value: string): string | null {
  if (isInternalId(value)) {
    return value;
  }

  if (isWorkflowId(value)) {
    return value;
  }

  return null;
}

export function parseSlugId(value: string): InternalId {
  const validId = lookoutForId(value);
  if (validId) {
    return validId;
  }

  const encodedValue = value.slice(-16);
  let decodedValue: string;
  try {
    decodedValue = decodeBase62(encodedValue);
  } catch (error) {
    return value;
  }
  const validDecodedId = lookoutForId(decodedValue);
  if (validDecodedId) {
    return validDecodedId;
  }

  return value;
}

@Injectable()
export class ParseSlugIdPipe implements PipeTransform<string, InternalId> {
  transform(value: string, metadata: ArgumentMetadata): InternalId {
    return parseSlugId(value);
  }
}
