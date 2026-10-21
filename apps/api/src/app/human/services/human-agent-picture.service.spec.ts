import { expect } from 'chai';
import sinon from 'sinon';
import {
  AGENT_PICTURE_MAX_BYTES,
  agentPictureUrl,
  detectPictureType,
  HumanAgentPictureService,
} from './human-agent-picture.service';

const ENV = '69f84d848bed9b0a73216d98';
const AGENT = '69f84d848bed9b0a73216d97';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

describe('HumanAgentPictureService', () => {
  const scope = { environmentId: ENV, organizationId: 'org1', agentIdentifier: 'human-relay' };

  function setup(agent: Record<string, unknown> | null = {}) {
    const stored = agent && {
      _id: AGENT,
      identifier: 'human-relay',
      name: 'Human',
      runtime: 'human_relay',
      _environmentId: ENV,
      _organizationId: 'org1',
      ...agent,
    };
    const agentRepository = { findOne: sinon.stub().resolves(stored), updateOne: sinon.stub().resolves() };
    const storageService = {
      uploadFile: sinon.stub().resolves(),
      deleteFile: sinon.stub().resolves(),
      getFile: sinon.stub().resolves(PNG),
    };
    const humanAgentIdentity = { updateTelegramBots: sinon.stub().resolves() };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanAgentPictureService(
      agentRepository as never,
      storageService as never,
      humanAgentIdentity as never,
      logger as never
    );

    return { service, agentRepository, storageService, humanAgentIdentity };
  }

  it('tells a JPEG and a PNG by their first bytes, and nothing else', () => {
    expect(detectPictureType(JPEG)?.contentType).to.equal('image/jpeg');
    expect(detectPictureType(PNG)?.contentType).to.equal('image/png');
    expect(detectPictureType(Buffer.from('<svg onload=alert(1)>'))).to.equal(null);
  });

  it('stores the picture, saves it on the agent and sets it on the Telegram bots', async () => {
    const { service, agentRepository, storageService, humanAgentIdentity } = setup();

    const agent = await service.save(scope, PNG);

    const [key, , contentType] = storageService.uploadFile.firstCall.args;
    expect(key).to.match(new RegExp(`^org1/${ENV}/agents/${AGENT}/picture-[0-9a-f]{16}\\.png$`));
    expect(contentType).to.equal('image/png');
    expect(agentRepository.updateOne.firstCall.args[1].$set.picture.storageKey).to.equal(key);
    expect(humanAgentIdentity.updateTelegramBots.firstCall.args[1].picture.storageKey).to.equal(key);
    expect(service.describe(agent).pictureUrl).to.contain(`/v1/human/agent-pictures/${ENV}/${AGENT}/`);
  });

  it('deletes the picture it replaces', async () => {
    const { service, storageService } = setup({
      picture: { storageKey: 'old-key', contentType: 'image/png', version: 'v0' },
    });

    await service.save(scope, JPEG);

    expect(storageService.deleteFile.firstCall.args[0]).to.equal('old-key');
  });

  it('refuses a file that is not a picture, and one that is too large', async () => {
    const { service, storageService } = setup();

    await expectRejection(service.save(scope, Buffer.from('<html>')), 'JPEG or a PNG');
    await expectRejection(service.save(scope, Buffer.alloc(AGENT_PICTURE_MAX_BYTES + 1)), '2 MB');
    expect(storageService.uploadFile.called).to.equal(false);
  });

  it('refuses when there is no Human agent', async () => {
    const { service } = setup(null);

    await expectRejection(service.save(scope, PNG), 'npx @agentinbox/cli setup');
  });

  it('removes the picture from the agent, the storage and the Telegram bots', async () => {
    const { service, agentRepository, storageService, humanAgentIdentity } = setup({
      picture: { storageKey: 'old-key', contentType: 'image/png', version: 'v0' },
    });

    await service.remove(scope);

    expect(agentRepository.updateOne.firstCall.args[1]).to.deep.equal({ $unset: { picture: 1 } });
    expect(storageService.deleteFile.firstCall.args[0]).to.equal('old-key');
    expect(humanAgentIdentity.updateTelegramBots.firstCall.args[1]).to.deep.equal({ picture: null });
  });

  it('serves a picture only at its current address', async () => {
    const { service, storageService } = setup({
      picture: { storageKey: 'key', contentType: 'image/png', version: 'v1' },
    });

    expect(await service.read({ environmentId: ENV, agentId: AGENT, version: 'v1' })).to.deep.equal({
      file: PNG,
      contentType: 'image/png',
    });
    expect(await service.read({ environmentId: ENV, agentId: AGENT, version: 'v0' })).to.equal(null);
    expect(await service.read({ environmentId: '../etc', agentId: AGENT, version: 'v1' })).to.equal(null);
    expect(storageService.getFile.callCount).to.equal(1);
  });

  it('serves no picture of an agent that is not a Human agent', async () => {
    const { service } = setup({
      runtime: 'self-hosted',
      picture: { storageKey: 'key', contentType: 'image/png', version: 'v1' },
    });

    expect(await service.read({ environmentId: ENV, agentId: AGENT, version: 'v1' })).to.equal(null);
  });
});

describe('agentPictureUrl', () => {
  const agent = {
    _id: AGENT,
    _environmentId: ENV,
    picture: { storageKey: 'key', contentType: 'image/png', version: 'v1' },
  };
  const names = ['HUMAN_DASHBOARD_URL', 'NOVU_REGION', 'API_ROOT_URL'] as const;
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));

  afterEach(() => {
    for (const name of names) {
      if (saved[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved[name];
      }
    }
  });

  it('goes through the Agent Inbox dashboard, whose /api forwards to the US API', () => {
    process.env.HUMAN_DASHBOARD_URL = 'https://www.agentinbox.md/';
    process.env.NOVU_REGION = 'us-east-1';
    process.env.API_ROOT_URL = 'https://api.novu.co';

    expect(agentPictureUrl(agent)).to.equal(`https://www.agentinbox.md/api/v1/agent-pictures/${ENV}/${AGENT}/v1`);
  });

  it('keeps the API address in the EU, which the dashboard does not forward to, and without a dashboard', () => {
    process.env.HUMAN_DASHBOARD_URL = 'https://www.agentinbox.md';
    process.env.NOVU_REGION = 'eu-west-2';
    process.env.API_ROOT_URL = 'https://eu.api.novu.co/';
    expect(agentPictureUrl(agent)).to.equal(`https://eu.api.novu.co/v1/human/agent-pictures/${ENV}/${AGENT}/v1`);

    process.env.HUMAN_DASHBOARD_URL = '';
    process.env.NOVU_REGION = 'us-east-1';
    process.env.API_ROOT_URL = 'https://novu.example.com';
    expect(agentPictureUrl(agent)).to.equal(`https://novu.example.com/v1/human/agent-pictures/${ENV}/${AGENT}/v1`);
  });

  it('has no address for an agent without a picture', () => {
    expect(agentPictureUrl({ _id: AGENT, _environmentId: ENV })).to.equal(undefined);
  });
});

async function expectRejection(promise: Promise<unknown>, message: string): Promise<void> {
  try {
    await promise;
  } catch (err) {
    expect((err as Error).message).to.contain(message);

    return;
  }

  throw new Error(`Expected a rejection mentioning "${message}".`);
}
