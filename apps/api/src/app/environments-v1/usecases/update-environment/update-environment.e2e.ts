import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { UpdateEnvironmentRequestDto } from '../../dtos/update-environment-request.dto';

describe('Update Environment - /environments (PUT)', async () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update environment entity correctly', async () => {
    const updatePayload: UpdateEnvironmentRequestDto = {
      identifier: 'updated-environment-identifier',
      color: '#3366ff',
    };

    await session.testAgent.put(`/v1/environments/${session.environment._id}`).send(updatePayload).expect(200);
    const { body } = await session.testAgent.get('/v1/environments/me');

    expect(body.data.identifier).to.equal(updatePayload.identifier);
    expect(body.data.color).to.equal(updatePayload.color);
  });

  // Locks in SSRF validation on `bridge.url` before it is persisted. Without
  // this guard, environment write access could store internal targets that the
  // worker later reaches with SSRF protection disabled.
  describe('bridge.url SSRF protection', () => {
    async function updateBridgeUrl(bridgeUrl: string) {
      return session.testAgent.put(`/v1/environments/${session.environment._id}`).send({
        bridge: { url: bridgeUrl },
      });
    }

    async function expectBridgeUrlNotStored(bridgeUrl: string): Promise<void> {
      const environment = await environmentRepository.findOne({ _id: session.environment._id });
      const storedUrl = environment?.bridge?.url || environment?.echo?.url || '';

      expect(storedUrl).to.not.equal(bridgeUrl);
    }

    it('should persist a safe public bridge.url to bridge and echo', async () => {
      const bridgeUrl = 'https://example.com/api/novu';

      await updateBridgeUrl(bridgeUrl).expect(200);

      const environment = await environmentRepository.findOne({ _id: session.environment._id });

      expect(environment?.bridge?.url).to.equal(bridgeUrl);
      expect(environment?.echo?.url).to.equal(bridgeUrl);
    });

    it('should reject bridge.url pointing at localhost', async () => {
      const bridgeUrl = 'http://localhost:4000/api/novu';
      const result = await updateBridgeUrl(bridgeUrl);

      expect(result.status).to.equal(400);
      expect(JSON.stringify(result.body)).to.match(/blocked by the outbound SSRF policy/i);
      expect(JSON.stringify(result.body)).to.not.match(/localhost/i);
      await expectBridgeUrlNotStored(bridgeUrl);
    });

    it('should reject bridge.url pointing at cloud metadata hostname', async () => {
      const bridgeUrl = 'http://metadata.google.internal/computeMetadata/v1/';
      const result = await updateBridgeUrl(bridgeUrl);

      expect(result.status).to.equal(400);
      expect(JSON.stringify(result.body)).to.match(/blocked by the outbound SSRF policy/i);
      expect(JSON.stringify(result.body)).to.not.match(/metadata\.google\.internal/i);
      await expectBridgeUrlNotStored(bridgeUrl);
    });

    it('should reject bridge.url with embedded credentials', async () => {
      const bridgeUrl = 'http://attacker:pass@example.com/api/novu';
      const result = await updateBridgeUrl(bridgeUrl);

      expect(result.status).to.equal(400);
      expect(JSON.stringify(result.body)).to.match(/blocked by the outbound SSRF policy/i);
      await expectBridgeUrlNotStored(bridgeUrl);
    });

    it('should reject bridge.url pointing at link-local cloud metadata IP', async () => {
      const bridgeUrl = 'http://169.254.169.254/computeMetadata/v1/';
      const result = await updateBridgeUrl(bridgeUrl);

      expect(result.status).to.equal(400);
      expect(JSON.stringify(result.body)).to.match(/blocked by the outbound SSRF policy/i);
      expect(JSON.stringify(result.body)).to.not.match(/169\.254\.169\.254/);
      await expectBridgeUrlNotStored(bridgeUrl);
    });

    it('should accept clearing bridge.url', async () => {
      await session.testAgent
        .put(`/v1/environments/${session.environment._id}`)
        .send({ bridge: { url: 'https://example.com/api/novu' } })
        .expect(200);

      const cleared = await session.testAgent
        .put(`/v1/environments/${session.environment._id}`)
        .send({ bridge: { url: '' } })
        .expect(200);

      expect(cleared.status).to.equal(200);

      const environment = await environmentRepository.findOne({ _id: session.environment._id });
      expect(environment?.bridge?.url || '').to.equal('');
      expect(environment?.echo?.url || '').to.equal('');
    });
  });
});
