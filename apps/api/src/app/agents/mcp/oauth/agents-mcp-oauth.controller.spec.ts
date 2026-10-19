import { HttpStatus } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';

import { AgentsMcpOAuthController } from './agents-mcp-oauth.controller';

describe('AgentsMcpOAuthController connect redirect', () => {
  function makeController() {
    const mcpOAuthCallbackUsecase = {};
    const completeProviderManagedRedirect = {};
    const mcpConnectRedirect = {
      resolve: sinon.stub(),
    };
    const controller = new AgentsMcpOAuthController(
      mcpOAuthCallbackUsecase as any,
      completeProviderManagedRedirect as any,
      mcpConnectRedirect as any
    );

    return { controller, mcpConnectRedirect };
  }

  it('302-redirects to the stored authorize URL', async () => {
    const { controller, mcpConnectRedirect } = makeController();
    mcpConnectRedirect.resolve.resolves('https://provider.example/oauth/authorize?state=abc');

    const res = {
      redirect: sinon.stub(),
      status: sinon.stub().returnsThis(),
      setHeader: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };

    await controller.getConnectRedirect(res as any, 'short-token');

    expect(mcpConnectRedirect.resolve.calledOnceWithExactly('short-token')).to.equal(true);
    expect(
      res.redirect.calledOnceWithExactly(HttpStatus.FOUND, 'https://provider.example/oauth/authorize?state=abc')
    ).to.equal(true);
    expect(res.send.called).to.equal(false);
  });

  it('renders an expired link page when the token is missing', async () => {
    const { controller, mcpConnectRedirect } = makeController();
    mcpConnectRedirect.resolve.resolves(null);

    const res = {
      redirect: sinon.stub(),
      status: sinon.stub().returnsThis(),
      setHeader: sinon.stub().returnsThis(),
      send: sinon.stub(),
    };

    await controller.getConnectRedirect(res as any, 'expired-token');

    expect(res.redirect.called).to.equal(false);
    expect(res.status.calledOnceWithExactly(HttpStatus.OK)).to.equal(true);
    expect(res.send.calledOnce).to.equal(true);
    expect(String(res.send.firstCall.args[0])).to.include('This link has expired');
  });
});
