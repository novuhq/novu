import { FilterQuery, SortOrder } from 'mongoose';

/**
 * Pure query-construction helpers shared by `BaseRepository` and `BaseRepositoryV2`
 * `findWithCursorBasedPagination`. Keyset pagination walks the compound key
 * `(sortBy, paginateField)`; every helper here builds the exact same filter and
 * sort objects the repositories used to build inline.
 */

/** A cursor position on the compound pagination key, as passed by callers in `before` / `after`. */
export interface CursorPosition {
  sortBy: string;
  paginateField: unknown;
}

export interface CursorPaginatedResult<TData> {
  data: TData[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
}

/** A document field read for cursor computation; `toString()` is the cursor token. */
interface CursorFieldValue {
  toString(): string;
}

type RangeOperator = '$gt' | '$gte' | '$lt' | '$lte';

interface CursorKey {
  sortBy: string;
  paginateField: string;
}

/** Values of the compound key at one position; compared with range operators in the filter. */
interface KeysetPosition {
  sortBy: unknown;
  paginateField: unknown;
}

/**
 * Merge a cursor-walking `$or` clause into `target` without dropping an existing
 * top-level `$or` from the caller's query. When both are present, both are
 * preserved by moving each under an entry in `$and` (which Mongo evaluates as
 * an implicit AND with the rest of the query).
 */
export function mergeTopLevelOr<TModel>(target: FilterQuery<TModel>, incomingOr: FilterQuery<TModel>[]): void {
  if (target.$or) {
    target.$and = [...(target.$and ?? []), { $or: target.$or }, { $or: incomingOr }];
    delete target.$or;
  } else {
    target.$or = incomingOr;
  }
}

function rangeOperator(towardsGreater: boolean, inclusive: boolean): RangeOperator {
  if (towardsGreater) {
    return inclusive ? '$gte' : '$gt';
  }

  return inclusive ? '$lte' : '$lt';
}

/**
 * `[{ sortBy <op> a }, { sortBy == a AND paginateField <op> b }]`: every row past
 * the position `(a, b)` on the compound key, in the direction of `operator`.
 */
function buildKeysetOr<TModel>(
  key: CursorKey,
  position: KeysetPosition,
  operator: RangeOperator
): FilterQuery<TModel>[] {
  // Field names are only known at runtime, so the clauses are asserted to the model's filter type.
  return [
    { [key.sortBy]: { [operator]: position.sortBy } } as FilterQuery<TModel>,
    {
      $and: [
        { [key.sortBy]: { $eq: position.sortBy } },
        { [key.paginateField]: { [operator]: position.paginateField } },
      ],
    } as FilterQuery<TModel>,
  ];
}

/**
 * The `$or` that restricts the page query to rows past the caller's cursor, or
 * `undefined` when neither `before` nor `after` is set.
 */
export function buildCursorWalkOr<TModel>({
  key,
  before,
  after,
  isDesc,
  includeCursor,
}: {
  key: CursorKey;
  before?: CursorPosition;
  after?: CursorPosition;
  isDesc: boolean;
  includeCursor?: boolean;
}): FilterQuery<TModel>[] | undefined {
  const inclusive = Boolean(includeCursor);

  if (before) {
    return buildKeysetOr(key, before, rangeOperator(isDesc, inclusive));
  }

  if (after) {
    return buildKeysetOr(key, after, rangeOperator(!isDesc, inclusive));
  }

  return undefined;
}

/**
 * The query that probes for a row on the other side of `boundaryItem` (the first
 * item when walking forward, the last item when walking backward), so the
 * opposite cursor is only returned when there is something to page to.
 */
export function buildAdjacentPageQuery<TModel, TRow>({
  query,
  key,
  boundaryItem,
  towardsGreater,
}: {
  query: FilterQuery<TModel>;
  key: CursorKey;
  boundaryItem: TRow;
  towardsGreater: boolean;
}): FilterQuery<TModel> {
  const adjacentQuery: FilterQuery<TModel> = { ...query };

  mergeTopLevelOr(
    adjacentQuery,
    buildKeysetOr(
      key,
      {
        sortBy: readCursorField(boundaryItem, key.sortBy),
        paginateField: readCursorField(boundaryItem, key.paginateField),
      },
      rangeOperator(towardsGreater, false)
    )
  );

  return adjacentQuery;
}

/** `{ [sortBy]: direction, [paginateField]: direction }` */
export function buildCursorSort(key: CursorKey, direction: SortOrder): Record<string, SortOrder> {
  return {
    [key.sortBy]: direction,
    [key.paginateField]: direction,
  };
}

/** Sort direction of the page query: the requested order, flipped when paging backwards. */
export function pageSortDirection(isDesc: boolean, reverseResults: boolean): 1 | -1 {
  return isDesc === reverseResults ? 1 : -1;
}

/**
 * The page query fetches `limit + 1` rows to detect whether another page exists.
 * Puts backward pages back in the requested order and drops the probe row.
 */
export function slicePage<TRow>(
  rawResults: TRow[],
  limit: number,
  reverseResults: boolean
): { pageResults: TRow[]; hasExtraItem: boolean } {
  const hasExtraItem = rawResults.length > limit;

  let startIndex = 0;
  let endIndex = limit;
  if (reverseResults) {
    rawResults.reverse();

    /**
     * If we have an extra item, we need to adjust the start and end index
     * as it is reversed, the first item is actually the extra item
     */
    if (hasExtraItem) {
      startIndex = 1;
      endIndex = limit + 1;
    }
  }

  return { pageResults: rawResults.slice(startIndex, endIndex), hasExtraItem };
}

/**
 * Reads a field off a page row by name. Rows are lean objects (V2) or hydrated
 * documents (V1), whose schema getters resolve on plain property access.
 */
export function readCursorField<TRow>(row: TRow, field: string): CursorFieldValue {
  return (row as Record<string, CursorFieldValue>)[field];
}

export function cursorToken<TRow>(row: TRow, paginateField: string): string {
  return readCursorField(row, paginateField).toString();
}
