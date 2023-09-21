/* eslint-disable no-console */
import '../src/config';
import {
  OrganizationRepository,
  EnvironmentRepository,
  MemberRepository,
  SubscriberRepository,
  IntegrationRepository,
  NotificationTemplateRepository,
} from '@novu/dal';

import { connect } from './connect-to-dal';
import { makeJsonBackup } from './make-json-backup';

const args = process.argv.slice(2);
const ORG_ID = args[0];
const folder = 'remove-organization';

async function removeSubscribers(organizationId: string, environmentIds: string[]) {
  const subscriberRepository = new SubscriberRepository();
  const subscribers = await subscriberRepository.find({
    _organizationId: organizationId,
    _environmentId: {
      $in: environmentIds,
    },
  });
  console.log(`Found ${subscribers.length} subscribers from all environments of the organization`);

  if (subscribers.length > 0) {
    console.log(`Removing ${subscribers.length} subscribers from all environments of the organization`);
    await makeJsonBackup(folder, 'subscribers', subscribers);
    await subscriberRepository._model.deleteMany({
      _id: {
        $in: subscribers.map((subscriber) => subscriber._id),
      },
    });
  }
}

async function removeIntegrations(organizationId: string, environmentIds: string[]) {
  const integrationRepository = new IntegrationRepository();
  const integrations = await integrationRepository.find({
    _organizationId: organizationId,
    _environmentId: {
      $in: environmentIds,
    },
  });
  console.log(`Found ${integrations.length} integrations from all environments of the organization`);

  if (integrations.length > 0) {
    console.log(`Removing ${integrations.length} integrations from all environments of the organization`);
    await makeJsonBackup(folder, 'integrations', integrations);
    await integrationRepository._model.deleteMany({
      _id: {
        $in: integrations.map((integration) => integration._id),
      },
    });
  }
}

async function removeWorkflows(organizationId: string, environmentIds: string[]) {
  const workflowsRepository = new NotificationTemplateRepository();
  const workflows = await workflowsRepository.find({
    _organizationId: organizationId,
    _environmentId: {
      $in: environmentIds,
    },
  });
  console.log(`Found ${workflows.length} workflows from all environments of the organization`);

  if (workflows.length > 0) {
    console.log(`Removing ${workflows.length} workflows from all environments of the organization`);
    await makeJsonBackup(folder, 'workflows', workflows);
    await workflowsRepository._model.deleteMany({
      _id: {
        $in: workflows.map((workflow) => workflow._id),
      },
    });
  }
}

connect(async () => {
  const organizationRepository = new OrganizationRepository();
  const environmentRepository = new EnvironmentRepository();
  const memberRepository = new MemberRepository();

  const organization = await organizationRepository.findById(ORG_ID);
  if (!organization) {
    throw new Error(`Organization with id ${ORG_ID} is not found`);
  }

  console.log(`The organization ${organization.name} is found`);

  const membersOfOrganization = await memberRepository._model.find({
    _organizationId: organization._id,
  });
  console.log(`The organization has ${membersOfOrganization.length} members`);

  if (membersOfOrganization.length > 0) {
    console.log(`Removing members from organization`);
    await makeJsonBackup(folder, 'members', membersOfOrganization);
    await memberRepository._model.deleteMany({
      _organizationId: organization._id,
    });
  }

  const environmentsOfOrganization = await environmentRepository.findOrganizationEnvironments(organization._id);
  const envIds = environmentsOfOrganization.map((env) => env._id);

  await removeSubscribers(organization._id, envIds);
  await removeIntegrations(organization._id, envIds);
  await removeWorkflows(organization._id, envIds);

  if (environmentsOfOrganization.length > 0) {
    console.log(`Removing all environments of the organization ${organization.name}`);
    await makeJsonBackup(folder, 'environments', environmentsOfOrganization);
    await environmentRepository._model.deleteMany({
      _id: {
        $in: envIds,
      },
      _organizationId: organization._id,
    });
  }

  console.log(`Removing the organization ${organization.name}`);
  await makeJsonBackup(folder, 'organization', organization);
  await organizationRepository.delete({ _id: organization._id });
});
