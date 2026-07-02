import { JobRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios, { AxiosResponse } from 'axios';
import { expect } from 'chai';
import getPort from 'get-port';
import { TestBridgeServer } from '../../../../e2e/test-bridge-server';

const eventTriggerPath = '/v1/events/trigger';

// Locks in the SSRF guard on the stateless `bridgeUrl` field that the
// `POST /v1/events/trigger` endpoint accepts (used by the local Studio /
// CLI to perform a one-off DISCOVER against a developer-supplied bridge).
//
// Without this guard, a caller with EVENT_WRITE could repoint the trigger
// at internal hosts (loopback name, RFC1918 / link-local IP literals, cloud
// metadata, embedded credentials, non-http schemes) and have both the API
// process and downstream worker EXECUTE calls fan out to those targets.
// See `Sync.assertSafeBridgeUrl` for the matching check on /bridge/sync.
describe('Trigger Event SSRF protection - /v1/events/trigger (POST) #novu-v2', () => {
  let session: UserSession;
  const jobRepository = new JobRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  async function trigger(bridgeUrl: string): Promise<AxiosResponse> {
    return axios.post(
      `${session.serverUrl}${eventTriggerPath}`,
      {
        name: 'ssrf-test-workflow',
        to: { subscriberId: session.subscriberId, email: 'ssrf@example.com' },
        payload: {},
        bridgeUrl,
      },
      {
        headers: { authorization: `ApiKey ${session.apiKey}` },
        validateStatus: () => true,
      }
    );
  }

  async function expectNoQueuedBridgeJob(): Promise<void> {
    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      'step.bridgeUrl': { $exists: true, $ne: null },
    });
    expect(jobs.length, 'no stateless bridge job should be queued for a blocked URL').to.equal(0);
  }

  it('should reject bridgeUrl pointing at localhost', async () => {
    const result = await trigger('http://localhost:4000/api/novu');

    expect(result.status).to.equal(400);
    expect(JSON.stringify(result.data)).to.match(/bridgeUrl/i);
    await expectNoQueuedBridgeJob();
  });

  it('should reject bridgeUrl pointing at cloud metadata hostname', async () => {
    const result = await trigger('http://metadata.google.internal/computeMetadata/v1/');

    expect(result.status).to.equal(400);
    expect(JSON.stringify(result.data)).to.match(/bridgeUrl/i);
    await expectNoQueuedBridgeJob();
  });

  it('should reject bridgeUrl with embedded credentials', async () => {
    const result = await trigger('http://attacker:pass@example.com/api/novu');

    expect(result.status).to.equal(400);
    expect(JSON.stringify(result.data)).to.match(/bridgeUrl/i);
    await expectNoQueuedBridgeJob();
  });

  it('should reject bridgeUrl with non-http scheme', async () => {
    const result = await trigger('ftp://example.com/api/novu');

    expect(result.status).to.equal(400);
    expect(JSON.stringify(result.data)).to.match(/bridgeUrl/i);
    await expectNoQueuedBridgeJob();
  });

  // Connect-time block: IP literal passes the synchronous URL policy but
  // must be rejected by the DNS-pinned guard before the TCP connect, and
  // the resolved IP must NOT leak into the response.
  it('should reject bridgeUrl pointing at link-local cloud metadata IP', async () => {
    const result = await trigger('http://169.254.169.254/computeMetadata/v1/');

    expect(result.status).to.equal(400);
    expect(JSON.stringify(result.data)).to.match(/blocked by the outbound SSRF policy/i);
    expect(JSON.stringify(result.data)).to.not.match(/169\.254\.169\.254/);
    await expectNoQueuedBridgeJob();
  });

  it('should reject bridgeUrl pointing at RFC1918 private IP', async () => {
    const result = await trigger('http://10.0.0.1/api/novu');

    expect(result.status).to.equal(400);
    expect(JSON.stringify(result.data)).to.match(/blocked by the outbound SSRF policy/i);
    expect(JSON.stringify(result.data)).to.not.match(/10\.0\.0\.1/);
    await expectNoQueuedBridgeJob();
  });

  // Sanity: a request without `bridgeUrl` must still complete the regular
  // (non-stateless) trigger pipeline without being touched by the SSRF guard.
  it('should accept triggers without a bridgeUrl', async () => {
    const result = await axios.post(
      `${session.serverUrl}${eventTriggerPath}`,
      {
        name: 'ssrf-test-workflow',
        to: { subscriberId: session.subscriberId, email: 'ssrf@example.com' },
        payload: {},
      },
      {
        headers: { authorization: `ApiKey ${session.apiKey}` },
        validateStatus: () => true,
      }
    );

    // The workflow doesn't exist in this test session, so the trigger is
    // expected to be unprocessable, but it must NOT be rejected as an SSRF
    // violation (would surface as 400 + "bridgeUrl: ..." instead).
    expect([201, 422]).to.include(result.status);
    if (result.status === 400) {
      expect(JSON.stringify(result.data)).to.not.match(/bridgeUrl/i);
    }
  });

  // Sanity: confirm a benign bridgeUrl pointing at the local TestBridgeServer
  // (allowed via NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS in .env.test) is not
  // blocked by the new guard. Without this, a regression that over-blocks
  // local fixtures would silently break the rest of the bridge-trigger
  // suite.
  it('should not reject bridgeUrl that resolves to a test-allow-listed IP', async () => {
    const port = await getPort();
    const bridgeServer = new TestBridgeServer(port);
    try {
      await bridgeServer.start({ workflows: [] });

      const result = await trigger(`${bridgeServer.serverPath}/novu`);

      // The bridge server has no workflow with this identifier, so the
      // trigger surfaces a 422 (workflow_not_found) — but it must NOT be
      // rejected with a 400 SSRF error.
      expect(result.status).to.not.equal(400);
      expect(JSON.stringify(result.data)).to.not.match(/blocked by the outbound SSRF policy/i);
    } finally {
      await bridgeServer.stop();
    }
  });
});
