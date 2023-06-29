import { getNextPageParam } from './pagination';

describe('getNextPageParam', () => {
  it.each`
    totalCount | pageSize | page | nextPage
    ${50}      | ${10}    | ${0} | ${1}
    ${50}      | ${10}    | ${1} | ${2}
    ${50}      | ${10}    | ${2} | ${3}
    ${50}      | ${10}    | ${3} | ${4}
    ${50}      | ${10}    | ${4} | ${undefined}
    ${2}       | ${1}     | ${0} | ${1}
    ${2}       | ${1}     | ${1} | ${undefined}
    ${1}       | ${1}     | ${0} | ${undefined}
  `(
    'returns the next page: totalCount: $totalCount, pageSize: $pageSize, page: $page, nextPage: $nextPage,',
    ({ totalCount, pageSize, page, nextPage }) => {
      const result = getNextPageParam({ totalCount, pageSize, page, data: [] });

      expect(result).toBe(nextPage);
    }
  );
});
