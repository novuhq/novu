import { BadRequestException } from '@nestjs/common';
import {
  buildDataFilterQuery,
  type DataFilterMongoFragment,
  DataFilterValidationError,
  normalizeDataFilter,
} from '@novu/shared';

/**
 * Validate a parsed `data` filter object against the shape supported by the
 * inbox API. Accepts scalars, `Scalar[]` (OR), `{ or: Scalar[] }` and
 * `{ and: [{ or: Scalar[] }, ...] }` (CNF) per top-level key, plus 1 level of
 * nested objects.
 *
 * Throws `BadRequestException` (so the existing API error contract is
 * preserved) if the structure is invalid.
 */
export function validateDataStructure(data: unknown): void {
  try {
    normalizeDataFilter(data);
  } catch (error) {
    if (error instanceof DataFilterValidationError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}

/**
 * Build the MongoDB filter fragment for a parsed `data` filter. Wraps
 * `buildDataFilterQuery` with a `BadRequestException` translation so it can be
 * used from inside use-cases that already validate via `validateDataStructure`.
 */
export function buildInboxDataFilterQuery(data: unknown): DataFilterMongoFragment {
  try {
    return buildDataFilterQuery(data);
  } catch (error) {
    if (error instanceof DataFilterValidationError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
