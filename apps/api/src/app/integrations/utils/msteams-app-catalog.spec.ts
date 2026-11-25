import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { findOrgCatalogTeamsAppIds } from './msteams-app-catalog';

const BOT_APP_ID = '3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b';
const GRAPH_TEAMS_APPS = 'https://graph.microsoft.com/v1.0/appCatalogs/teamsApps';

function appWithBot(id: string, botId: string | null) {
  return { id, appDefinitions: [{ bot: botId ? { id: botId } : null }] };
}

describe('findOrgCatalogTeamsAppIds', () => {
  let axiosGet: sinon.SinonStub;

  beforeEach(() => {
    axiosGet = sinon.stub(axios, 'get');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns the apps whose manifest ID is the bot app ID, without listing the catalog', async () => {
    axiosGet.resolves({ data: { value: [{ id: 'catalog-app-1' }] } });

    const ids = await findOrgCatalogTeamsAppIds('graph-token', BOT_APP_ID);

    expect(ids).to.deep.equal(['catalog-app-1']);
    expect(axiosGet.calledOnce).to.equal(true);

    const [url, config] = axiosGet.firstCall.args;
    expect(decodeURIComponent(url)).to.equal(
      `${GRAPH_TEAMS_APPS}?$filter=externalId eq '${BOT_APP_ID}' and distributionMethod eq 'organization'&$expand=appDefinitions`
    );
    expect(config.headers.Authorization).to.equal('Bearer graph-token');
  });

  it('finds Developer Portal apps by the bot ID when their manifest ID differs', async () => {
    axiosGet.onFirstCall().resolves({ data: { value: [] } });
    axiosGet.onSecondCall().resolves({
      data: {
        value: [
          appWithBot('other-app', 'another-bot-id'),
          appWithBot('no-bot-app', null),
          { id: 'tab-only-app' },
          appWithBot('portal-app', BOT_APP_ID.toUpperCase()),
        ],
      },
    });

    const ids = await findOrgCatalogTeamsAppIds('graph-token', BOT_APP_ID);

    expect(ids).to.deep.equal(['portal-app']);
    expect(axiosGet.calledTwice).to.equal(true);
    expect(decodeURIComponent(axiosGet.secondCall.args[0])).to.equal(
      `${GRAPH_TEAMS_APPS}?$filter=distributionMethod eq 'organization'&$expand=appDefinitions($expand=bot)`
    );
  });

  it("follows Graph's next page links when looking up by bot ID", async () => {
    const nextLink = `${GRAPH_TEAMS_APPS}?$skiptoken=page-2`;

    axiosGet.onFirstCall().resolves({ data: { value: [] } });
    axiosGet.onSecondCall().resolves({
      data: { value: [appWithBot('other-app', 'another-bot-id')], '@odata.nextLink': nextLink },
    });
    axiosGet.onThirdCall().resolves({ data: { value: [appWithBot('portal-app', BOT_APP_ID)] } });

    const ids = await findOrgCatalogTeamsAppIds('graph-token', BOT_APP_ID);

    expect(ids).to.deep.equal(['portal-app']);
    expect(axiosGet.thirdCall.args[0]).to.equal(nextLink);
  });

  it('stops at the first page with a match, so a failing later page cannot lose it', async () => {
    axiosGet.onFirstCall().resolves({ data: { value: [] } });
    axiosGet.onSecondCall().resolves({
      data: {
        value: [appWithBot('portal-app', BOT_APP_ID)],
        '@odata.nextLink': `${GRAPH_TEAMS_APPS}?$skiptoken=page-2`,
      },
    });
    axiosGet.onThirdCall().rejects(new Error('Graph is unavailable'));

    expect(await findOrgCatalogTeamsAppIds('graph-token', BOT_APP_ID)).to.deep.equal(['portal-app']);
    expect(axiosGet.calledTwice).to.equal(true);
  });

  it('does not follow a next page link outside Microsoft Graph', async () => {
    axiosGet.onFirstCall().resolves({ data: { value: [] } });
    axiosGet.onSecondCall().resolves({
      data: { value: [], '@odata.nextLink': 'https://attacker.example/teamsApps?$skiptoken=x' },
    });

    const ids = await findOrgCatalogTeamsAppIds('graph-token', BOT_APP_ID);

    expect(ids).to.deep.equal([]);
    expect(axiosGet.calledTwice).to.equal(true);
  });

  it('skips submissions still waiting for admin approval when looking up by bot ID', async () => {
    axiosGet.onFirstCall().resolves({ data: { value: [] } });
    axiosGet.onSecondCall().resolves({
      data: {
        value: [
          { id: 'pending-submission', appDefinitions: [{ publishingState: 'submitted', bot: { id: BOT_APP_ID } }] },
          { id: 'rejected-submission', appDefinitions: [{ publishingState: 'rejected', bot: { id: BOT_APP_ID } }] },
          {
            id: 'published-app',
            appDefinitions: [
              { publishingState: 'published', bot: { id: BOT_APP_ID } },
              { publishingState: 'submitted', bot: { id: BOT_APP_ID } },
            ],
          },
        ],
      },
    });

    expect(await findOrgCatalogTeamsAppIds('graph-token', BOT_APP_ID)).to.deep.equal(['published-app']);
  });

  it('looks up by bot ID when the only manifest ID match is a pending submission', async () => {
    axiosGet.onFirstCall().resolves({
      data: { value: [{ id: 'pending-submission', appDefinitions: [{ publishingState: 'submitted' }] }] },
    });
    axiosGet.onSecondCall().resolves({
      data: {
        value: [{ id: 'portal-app', appDefinitions: [{ publishingState: 'published', bot: { id: BOT_APP_ID } }] }],
      },
    });

    expect(await findOrgCatalogTeamsAppIds('graph-token', BOT_APP_ID)).to.deep.equal(['portal-app']);
  });

  it('returns no IDs when no org app uses the bot', async () => {
    axiosGet.onFirstCall().resolves({ data: { value: [] } });
    axiosGet.onSecondCall().resolves({ data: { value: [appWithBot('other-app', 'another-bot-id')] } });

    expect(await findOrgCatalogTeamsAppIds('graph-token', BOT_APP_ID)).to.deep.equal([]);
  });

  it('escapes single quotes in the app ID filter', async () => {
    axiosGet.resolves({ data: { value: [{ id: 'catalog-app-1' }] } });

    await findOrgCatalogTeamsAppIds('graph-token', "o'brien");

    expect(decodeURIComponent(axiosGet.firstCall.args[0])).to.contain("externalId eq 'o''brien'");
  });
});
