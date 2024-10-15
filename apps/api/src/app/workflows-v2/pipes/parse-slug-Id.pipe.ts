import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { decodeBase62, isBase62 } from '../../shared/helpers';

type InternalId = string;

const MIN_ENCODED_ID_LENGTH = 15;
const KNOWN_PREFIXES = ['wf_'];

function isSlugId(value: string): boolean {
  return value.includes('_');
}

function extractEncodedId(value: string): string {
  const parts = value.split('_');

  return parts[parts.length - 1];
}

function isValidEncodedId(encodedId: string): boolean {
  const one = isBase62(encodedId);
  const two = encodedId.length >= MIN_ENCODED_ID_LENGTH;

  return one && two;
}

function removePrefixIfPresent(id: string, prefixes: string[]): string {
  for (const prefix of prefixes) {
    if (id.startsWith(prefix)) {
      return id.slice(prefix.length);
    }
  }

  return id;
}

export function parseSlugId(value: string): InternalId {
  // if we got internal id we do not want to decode it, it may be an InternalId
  if (!isSlugId(value)) {
    return value;
  }

  // from `my-workflow_base62(wf_+InternalId)` to base62(wf_+InternalId)
  const encodedId = extractEncodedId(value);

  /*
   * if not valid encodedId return the original value because we assume it may be a workflowIdentifier
   * example `my_workflow_name_why_isInvalidEncoding` will be trimmed to `isInvalidEncoding`
   * this is not a valid validation, because `isInvalidEncoding` is longer than `MIN_ENCODED_ID_LENGTH` and is base62
   * in order to solve it we need to make sure that after we encode we will have novu prefix (wf_)
   * todo: we can keep this validation, but we need to validate after we encode we will have novu prefix (wf_) then decode
   *       otherwise we will return the original value
   *       assumption: we always have a prefix (wf_) in the encodedId
   */
  if (!isValidEncodedId(encodedId)) {
    return value;
  }

  // from `base62(wf_+InternalId)` to `wf_+InternalId`
  const decodedId = decodeBase62(encodedId);

  // from `wf_InternalId` to `InternalId`.
  return removePrefixIfPresent(decodedId, KNOWN_PREFIXES);
}

@Injectable()
export class ParseSlugIdPipe implements PipeTransform<string, InternalId> {
  transform(value: string, metadata: ArgumentMetadata): InternalId {
    return parseSlugId(value);
  }
}
