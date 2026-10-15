import type { StepResponseDto, WorkflowResponseDto } from '@novu/application-generic';
import type { PreferencesEntity } from '@novu/dal';
import { PreferencesTypeEnum, ResourceOriginEnum, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { expect } from 'chai';
import {
  mapWorkflowPreferences,
  mapWorkflowToCreateWorkflowDto,
  mapWorkflowToUpdateWorkflowDto,
} from './map-workflow-to-upsert-dto';

describe('map-workflow-to-upsert-dto', () => {
  const userPreferences = { all: { enabled: true, readOnly: false }, channels: {} };
  const workflowPreferences = { all: { enabled: false, readOnly: true }, channels: {} };
  const preferences = [
    { type: PreferencesTypeEnum.USER_WORKFLOW, preferences: userPreferences },
    { type: PreferencesTypeEnum.WORKFLOW_RESOURCE, preferences: workflowPreferences },
    { type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL, preferences: { all: { enabled: false } } },
  ] as unknown as PreferencesEntity[];

  const emailStep = {
    _id: 'source_step_1',
    stepId: 'email-step',
    name: 'Email',
    type: StepTypeEnum.EMAIL,
    controls: { values: { subject: 'Hi', layoutId: 'layout_1' } },
    providerOverrides: { sendgrid: { ip_pool_name: 'pool' } },
    integrationOverrides: null,
  } as unknown as StepResponseDto;
  const inAppStep = {
    _id: 'source_step_2',
    stepId: 'in-app-step',
    type: StepTypeEnum.IN_APP,
  } as unknown as StepResponseDto;

  const source = {
    _id: 'source_workflow',
    workflowId: 'order-shipped',
    payloadSchema: undefined,
    validatePayload: true,
    isTranslationEnabled: false,
    origin: ResourceOriginEnum.EXTERNAL,
    name: 'Order shipped',
    active: true,
    tags: ['orders'],
    description: 'Tells the customer',
    severity: 'high',
    agent: undefined,
    steps: [emailStep, inAppStep],
  } as unknown as WorkflowResponseDto;

  it('maps a workflow to a create DTO with NOVU_CLOUD origin, dashboard source and copied steps', () => {
    expect(mapWorkflowToCreateWorkflowDto(source, preferences)).to.deep.equal({
      workflowId: 'order-shipped',
      payloadSchema: null,
      validatePayload: true,
      isTranslationEnabled: false,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      name: 'Order shipped',
      active: true,
      tags: ['orders'],
      description: 'Tells the customer',
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      severity: 'high',
      agent: null,
      steps: [
        {
          stepId: 'email-step',
          name: 'Email',
          type: StepTypeEnum.EMAIL,
          controlValues: { subject: 'Hi', layoutId: 'layout_1' },
          providerOverrides: { sendgrid: { ip_pool_name: 'pool' } },
          integrationOverrides: null,
        },
        {
          stepId: 'in-app-step',
          name: '',
          type: StepTypeEnum.IN_APP,
          controlValues: {},
          providerOverrides: null,
          integrationOverrides: null,
        },
      ],
      preferences: { user: userPreferences, workflow: workflowPreferences },
    });
  });

  it('maps a workflow to an update DTO that reuses the internal ids of matching target steps', () => {
    const target = { steps: [{ _id: 'target_step_1', stepId: 'email-step' }] } as unknown as WorkflowResponseDto;

    const dto = mapWorkflowToUpdateWorkflowDto(source, target, preferences);

    expect(dto).to.not.have.property('__source');
    expect(dto.origin).to.equal(ResourceOriginEnum.NOVU_CLOUD);
    expect(dto.steps.map((step) => ('_id' in step ? step._id : undefined))).to.deep.equal(['target_step_1', undefined]);
    expect(dto.preferences).to.deep.equal({ user: userPreferences, workflow: workflowPreferences });
  });

  it('maps an update DTO without a target workflow to steps with no internal ids', () => {
    const dto = mapWorkflowToUpdateWorkflowDto(source, undefined, preferences);

    expect(dto.steps.every((step) => !('_id' in step))).to.equal(true);
  });

  it('returns undefined preferences when the workflow has none of the two types', () => {
    expect(mapWorkflowPreferences([])).to.deep.equal({ user: undefined, workflow: undefined });
  });
});
