import { InsertOptions } from './clickhouse.service';

/*
 * Default:
 * asyncInsert=true,
 * waitForAsyncInsert=false (true in test environment)
 */
export const getInsertOptions = (asyncInsertVariable: string, waitForAsyncInsertVariable: string): InsertOptions => {
  return {
    asyncInsert: asyncInsertVariable !== undefined ? asyncInsertVariable === 'true' : true,
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
