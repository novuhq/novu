import { InsertOptions } from './clickhouse.service';

/*
 * Default:
 * asyncInsert=true (false in test environment),
 * waitForAsyncInsert=false (true in test environment)
 *
 * Note: waitForAsyncInsert is ignored when asyncInsert=false (synchronous inserts)
 */
export const getInsertOptions = (asyncInsertVariable: string, waitForAsyncInsertVariable: string): InsertOptions => {
  return {
    asyncInsert: (() => {
      if (process.env.NODE_ENV === 'test') {
        return false;
      }
      if (asyncInsertVariable !== undefined) {
        return asyncInsertVariable === 'true';
      }

      return true;
    })(),
    waitForAsyncInsert: (() => {
      if (process.env.NODE_ENV === 'test') {
        return true;
      }
      if (waitForAsyncInsertVariable !== undefined) {
        return waitForAsyncInsertVariable === 'true';
      }

      return false;
    })(),
  };
};
