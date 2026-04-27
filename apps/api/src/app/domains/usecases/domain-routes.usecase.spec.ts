import { NotFoundException } from '@nestjs/common';
import { DirectionEnum, DomainRouteTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';
import { CreateDomainRoute } from './create-domain-route/create-domain-route.usecase';
import { DeleteDomainRoute } from './delete-domain-route/delete-domain-route.usecase';
import { GetDomainRoute } from './get-domain-route/get-domain-route.usecase';
import { ListDomainRoutes } from './list-domain-routes/list-domain-routes.usecase';
import { UpdateDomainRoute } from './update-domain-route/update-domain-route.usecase';

const ENVIRONMENT_ID = 'environment-id';
const ORGANIZATION_ID = 'organization-id';
const USER_ID = 'user-id';
const DOMAIN_ID = 'domain-id';
const DOMAIN_NAME = 'example.com';
const ROUTE_ID = 'route-id';
const AGENT_ID = 'agent-id';
const AGENT_IDENTIFIER = 'agent-identifier';

const domain = {
  _id: DOMAIN_ID,
  name: DOMAIN_NAME,
  _environmentId: ENVIRONMENT_ID,
  _organizationId: ORGANIZATION_ID,
};

const route = {
  _id: ROUTE_ID,
  _domainId: DOMAIN_ID,
  address: 'support',
  destination: AGENT_ID,
  type: DomainRouteTypeEnum.AGENT,
  _environmentId: ENVIRONMENT_ID,
  _organizationId: ORGANIZATION_ID,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const user = {
  _id: USER_ID,
  environmentId: ENVIRONMENT_ID,
  organizationId: ORGANIZATION_ID,
};

describe('Domain route usecases', () => {
  let domainRepositoryMock;
  let domainRouteRepositoryMock;
  let agentRepositoryMock;

  beforeEach(() => {
    domainRepositoryMock = {
      findOne: stub().resolves(domain),
    };
    domainRouteRepositoryMock = {
      create: stub().resolves(route),
      listRoutes: stub().resolves({
        routes: [route],
        next: null,
        previous: null,
        totalCount: 1,
        totalCountCapped: false,
      }),
      findOneByIdAndDomain: stub().resolves(route),
      findOneAndUpdate: stub().resolves(route),
      findOneAndDelete: stub().resolves(route),
    };
    agentRepositoryMock = {
      findOne: stub().resolves({ _id: AGENT_ID }),
    };
  });

  afterEach(() => {
    restore();
  });

  it('creates a domain route after resolving the agent identifier', async () => {
    const usecase = new CreateDomainRoute(domainRepositoryMock, domainRouteRepositoryMock, agentRepositoryMock);

    const result = await usecase.execute({
      domain: DOMAIN_NAME,
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      address: 'support',
      agentId: AGENT_IDENTIFIER,
      type: DomainRouteTypeEnum.AGENT,
    });

    expect(result._id).to.equal(ROUTE_ID);
    expect(result.agentId).to.equal(AGENT_ID);
    expect(
      agentRepositoryMock.findOne.calledWithMatch({
        identifier: AGENT_IDENTIFIER,
        _environmentId: ENVIRONMENT_ID,
        _organizationId: ORGANIZATION_ID,
      })
    ).to.equal(true);
    expect(
      domainRouteRepositoryMock.create.calledWithMatch({
        _domainId: DOMAIN_ID,
        address: 'support',
        destination: AGENT_ID,
      })
    ).to.equal(true);
  });

  it('lists domain routes with cursor metadata', async () => {
    const usecase = new ListDomainRoutes(domainRepositoryMock, domainRouteRepositoryMock, agentRepositoryMock);

    const result = await usecase.execute({
      user,
      domain: DOMAIN_NAME,
      limit: 10,
      orderBy: '_id',
      orderDirection: DirectionEnum.DESC,
    });

    expect(result.data).to.have.length(1);
    expect(result.totalCount).to.equal(1);
    expect(domainRouteRepositoryMock.listRoutes.calledWithMatch({ domainId: DOMAIN_ID })).to.equal(true);
  });

  it('retrieves a single route scoped to its domain', async () => {
    const usecase = new GetDomainRoute(domainRepositoryMock, domainRouteRepositoryMock);

    const result = await usecase.execute({
      domain: DOMAIN_NAME,
      routeId: ROUTE_ID,
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
    });

    expect(result._id).to.equal(ROUTE_ID);
  });

  it('updates a route after resolving its current value', async () => {
    const usecase = new UpdateDomainRoute(domainRepositoryMock, domainRouteRepositoryMock, agentRepositoryMock);

    const result = await usecase.execute({
      domain: DOMAIN_NAME,
      routeId: ROUTE_ID,
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      address: 'billing',
    });

    expect(result._id).to.equal(ROUTE_ID);
    expect(domainRouteRepositoryMock.findOneAndUpdate.called).to.equal(true);
  });

  it('deletes a route scoped to its domain', async () => {
    const usecase = new DeleteDomainRoute(domainRepositoryMock, domainRouteRepositoryMock);

    await usecase.execute({
      domain: DOMAIN_NAME,
      routeId: ROUTE_ID,
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
    });

    expect(
      domainRouteRepositoryMock.findOneAndDelete.calledWithMatch({ _id: ROUTE_ID, _domainId: DOMAIN_ID })
    ).to.equal(true);
  });

  it('throws when the parent domain does not exist', async () => {
    domainRepositoryMock.findOne.resolves(null);
    const usecase = new CreateDomainRoute(domainRepositoryMock, domainRouteRepositoryMock, agentRepositoryMock);

    try {
      await usecase.execute({
        domain: DOMAIN_NAME,
        environmentId: ENVIRONMENT_ID,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        address: 'support',
        agentId: AGENT_IDENTIFIER,
        type: DomainRouteTypeEnum.AGENT,
      });
      throw new Error('Expected error not thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
    }
  });
});
