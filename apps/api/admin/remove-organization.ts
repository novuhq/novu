/* eslint-disable no-console */
import '../src/config';
import {
  OrganizationRepository,
  EnvironmentRepository,
  MemberRepository,
  SubscriberRepository,
  IntegrationRepository,
  NotificationTemplateRepository,
  ChangeRepository,
  ExecutionDetailsRepository,
  BaseRepository,
  EnvironmentId,
  OrganizationId,
  EnforceEnvOrOrgIds,
  FeedRepository,
  JobRepository,
  LayoutRepository,
  LogRepository,
  MessageRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationRepository,
  SubscriberPreferenceRepository,
  TenantRepository,
  TopicRepository,
  TopicSubscribersRepository,
} from '@novu/dal';

import { connect } from './connect-to-dal';
import { makeJsonBackup } from './make-json-backup';

const args = process.argv.slice(2);
const ORG_ID = args[0];
const folder = 'remove-organization';

async function removeData<T extends BaseRepository<object, E, EnforceEnvOrOrgIds>, E extends { _id?: string }>(
  repository: T,
  model: string,
  organizationId: OrganizationId,
  environmentIds: EnvironmentId[]
) {
  const data = await repository.find({
    _organizationId: organizationId,
    _environmentId: {
      $in: environmentIds,
    },
  });
  console.log(`Found ${data.length} ${model} from all environments of the organization`);

  if (data.length > 0) {
    console.log(`Removing ${data.length} ${model} from all environments of the organization`);
    await makeJsonBackup(folder, model, data);
    await repository._model.deleteMany({
      _id: {
        $in: data.map((change) => change._id),
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

  await removeData(new ChangeRepository(), 'changes', organization._id, envIds);
  // await removeData(new ExecutionDetailsRepository(), 'executiondetails', organization._id, envIds);
  await removeData(new FeedRepository(), 'feeds', organization._id, envIds);
  await removeData(new IntegrationRepository(), 'integrations', organization._id, envIds);
  // await removeData(new JobRepository(), 'jobs', organization._id, envIds);
  await removeData(new LayoutRepository(), 'layouts', organization._id, envIds);
  await removeData(new LogRepository(), 'logs', organization._id, envIds);
  await removeData(new MessageRepository(), 'messages', organization._id, envIds);
  await removeData(new MessageTemplateRepository(), 'messagetemplates', organization._id, envIds);
  await removeData(new NotificationGroupRepository(), 'notificationgroups', organization._id, envIds);
  // await removeData(new NotificationRepository(), 'notifications', organization._id, envIds);
  await removeData(new NotificationTemplateRepository(), 'workflows', organization._id, envIds);
  await removeData(new SubscriberPreferenceRepository(), 'subscriberpreferences', organization._id, envIds);
  await removeData(new SubscriberRepository(), 'subscribers', organization._id, envIds);
  await removeData(new TenantRepository(), 'tenants', organization._id, envIds);
  await removeData(new TopicRepository(), 'topics', organization._id, envIds);
  await removeData(new TopicSubscribersRepository(), 'topicsubscribers', organization._id, envIds);

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
