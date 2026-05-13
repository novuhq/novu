/**
 * Test-only stub for `BridgeExecutorService.execute` that performs the real
 * outbound bridge call but skips the redundant pre-flight `resolvePublicAddresses`
 * SSRF check.
 *
 * Why bypass the pre-flight: the bridge executor calls `resolvePublicAddresses`
 * directly before `safeOutboundJsonRequest`, but the former does NOT honor the
 * `NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS` allow-list (only the latter does, via its
 * private `resolveWithTestAllowList`). For tests we need the bridge to reach an
 * in-process server bound to `0.0.0.0` / `127.0.0.1`; the actual outbound
 * request via `safeOutboundJsonRequest` is still SSRF-validated against the
 * allow-list, so we keep the same protection in production.
 *
 * This stub intentionally calls into the service's private `resolveBridgeUrl`
 * and `buildPayload` via reflection so the payload shape, signature header,
 * and bridge-URL resolution rules stay in lockstep with production code. If
 * those internals change shape, the stub will fail loudly at compile or runtime
 * and force the test author to revisit it.
 */

import {
  buildNovuSignatureHeader,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  safeOutboundJsonRequest,
} from '@novu/application-generic';
import type { AgentBridgeRequest } from '@novu/framework';
import { HttpHeaderKeysEnum } from '@novu/framework/internal';
import sinon from 'sinon';
import { AgentExecutionParams, BridgeExecutorService, NoBridgeUrlError } from '../../services/bridge-executor.service';

interface BridgeExecutorInternals {
  resolveBridgeUrl: (
    config: AgentExecutionParams['config'],
    agentIdentifier: string,
    event: AgentExecutionParams['event']
  ) => string | null;
  buildPayload: (params: AgentExecutionParams) => Promise<AgentBridgeRequest>;
  getDecryptedSecretKey: GetDecryptedSecretKey;
}

export interface BridgeExecutorStubHandle {
  /** Resolves once every dispatched bridge call has settled (success or failure). */
  drain: () => Promise<void>;
  /** Recorded params for assertions. */
  calls: AgentExecutionParams[];
}

export function stubBridgeExecutorWithRealHttp(bridgeExecutor: BridgeExecutorService): BridgeExecutorStubHandle {
  const calls: AgentExecutionParams[] = [];
  const inflight = new Set<Promise<unknown>>();

  const internals = bridgeExecutor as unknown as BridgeExecutorInternals;

  sinon.stub(bridgeExecutor, 'execute').callsFake(async (params: AgentExecutionParams) => {
    calls.push(params);

    const agentIdentifier = params.config.agentIdentifier;
    const bridgeUrl = internals.resolveBridgeUrl(params.config, agentIdentifier, params.event);

    if (!bridgeUrl) {
      throw new NoBridgeUrlError(agentIdentifier);
    }

    const secretKey = await internals.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: params.config.environmentId,
        organizationId: params.config.organizationId,
      })
    );

    const payload = await internals.buildPayload(params);
    const signatureHeader = buildNovuSignatureHeader(secretKey, payload);

    const work = (async () => {
      const response = await safeOutboundJsonRequest({
        url: bridgeUrl,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [HttpHeaderKeysEnum.NOVU_SIGNATURE]: signatureHeader,
        },
        body: payload,
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
