/**
 * Test-only stub for `BridgeExecutorService.execute`. It sends the signed payload
 * `prepareSignedBridgeRequest` builds, and skips the pre-flight DNS check.
 * That check does not honor `NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS`. The request
 * itself still does, so an in-process server on 127.0.0.1 can be reached.
 */

import { HttpHeaderKeysEnum } from '@novu/framework/internal';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import sinon from 'sinon';
import {
  AgentExecutionParams,
  BridgeExecutorService,
} from '../../conversation-runtime/runtime/bridge-executor.service';

export interface BridgeExecutorStubHandle {
  /** Resolves once every dispatched bridge call has settled (success or failure). */
  drain: () => Promise<void>;
  /** Recorded params for assertions. */
  calls: AgentExecutionParams[];
}

export function stubBridgeExecutorWithRealHttp(bridgeExecutor: BridgeExecutorService): BridgeExecutorStubHandle {
  const calls: AgentExecutionParams[] = [];
  const inflight = new Set<Promise<unknown>>();

  sinon.stub(bridgeExecutor, 'execute').callsFake(async (params: AgentExecutionParams) => {
    calls.push(params);

    const prepared = await bridgeExecutor.prepareSignedBridgeRequest(params);
    const work = (async () => {
      const response = await safeOutboundJsonRequest({
        url: prepared.bridgeUrl,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [HttpHeaderKeysEnum.NOVU_SIGNATURE]: prepared.signatureHeader,
        },
        body: prepared.payload,
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`[bridge-stub] Bridge returned ${response.statusCode}: ${response.statusMessage}`);
      }
    })();

    inflight.add(work);
    work
      .finally(() => inflight.delete(work))
      .catch(() => {
        /* swallow — the actual error is observable via inflight rejections in drain() */
      });
  });

  return {
    drain: async () => {
      while (inflight.size > 0) {
        await Promise.allSettled([...inflight]);
      }
    },
    calls,
  };
}
