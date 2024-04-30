import * as request from 'supertest';

/**
 * Source: https://github.com/ladjs/supertest/issues/12#issuecomment-1081640817
 *
 * Usage: wait session.testAgent.put('/v1/your/route').send(payload).expect(processResult(200));
 */
export function processTestAgentExpectedStatusCode(statusCode: number): request.CallbackHandler {
  const stackTrace = new Error().stack?.split('\n') ?? [];
  stackTrace.splice(1, 1);

  return (err: any, res: Response) => {
    if ((res?.status || err.status) !== statusCode) {
      const e = new Error(
        `Expected ${statusCode}, got ${res?.status || err.status} resp: ${
          res?.headers ? JSON.stringify(res.headers) : JSON.stringify(err, null, 2)
        }`
      );
      e.stack = e.stack
        ?.split('\n')
        .splice(0, 1)
        .concat(stackTrace) // Remove this line not to show stack trace
        .join('\n');
      throw e;
    }
  };
}
