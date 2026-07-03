import { NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { expect } from 'chai';
import { stub } from 'sinon';
import { validateEnvironmentVariableValues } from './validate-environment-variable-values';

describe('validateEnvironmentVariableValues', () => {
  const organizationId = 'org-id';
  let environmentRepositoryMock: { findByIdAndOrganization: ReturnType<typeof stub> };

  beforeEach(() => {
    environmentRepositoryMock = {
      findByIdAndOrganization: stub(),
    };
  });

  it('should skip validation when values are empty', async () => {
    await validateEnvironmentVariableValues(
      environmentRepositoryMock as unknown as EnvironmentRepository,
      organizationId,
      []
    );

    expect(environmentRepositoryMock.findByIdAndOrganization.called).to.equal(false);
  });

  it('should validate unique environment ids belong to the organization', async () => {
    environmentRepositoryMock.findByIdAndOrganization
      .withArgs('env-a', organizationId)
      .resolves({ _id: 'env-a' })
      .withArgs('env-b', organizationId)
      .resolves({ _id: 'env-b' });

    await validateEnvironmentVariableValues(
      environmentRepositoryMock as unknown as EnvironmentRepository,
      organizationId,
      [
        { _environmentId: 'env-a', value: 'a' },
        { _environmentId: 'env-b', value: 'b' },
        { _environmentId: 'env-a', value: 'a-duplicate' },
      ]
    );

    expect(environmentRepositoryMock.findByIdAndOrganization.callCount).to.equal(2);
  });

  it('should reject environment ids that do not belong to the organization', async () => {
    environmentRepositoryMock.findByIdAndOrganization.withArgs('foreign-env-id', organizationId).resolves(null);

    try {
      await validateEnvironmentVariableValues(
        environmentRepositoryMock as unknown as EnvironmentRepository,
        organizationId,
        [{ _environmentId: 'foreign-env-id', value: 'value' }]
      );
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
      expect(error.message).to.equal('Environment with id foreign-env-id not found');
    }
  });
});
