import { getNextPageParam } from './pagination';

describe('getNextPageParam', () => {
  it.each`
    totalCount | pageSize | page | nextPage     | hasMore
    ${50}      | ${10}    | ${0} | ${1}         | ${true}
    ${50}      | ${10}    | ${1} | ${2}         | ${true}
    ${50}      | ${10}    | ${2} | ${3}         | ${true}
    ${50}      | ${10}    | ${3} | ${4}         | ${true}
    ${50}      | ${10}    | ${4} | ${undefined} | ${false}
    ${2}       | ${1}     | ${0} | ${1}         | ${true}
    ${2}       | ${1}     | ${1} | ${undefined} | ${false}
    ${1}       | ${1}     | ${0} | ${undefined} | ${false}
  `(
    'returns the next page: totalCount: $totalCount, pageSize: $pageSize, page: $page, nextPage: $nextPage,',
    ({ totalCount, pageSize, page, nextPage, hasMore }) => {
      const result = getNextPageParam({ totalCount, pageSize, page, data: [], hasMore });

      expect(result).toBe(nextPage);
    }
  );
});
