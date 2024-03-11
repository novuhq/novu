import { expect } from 'chai';
import { NotificationTemplateEntity } from '@novu/dal';
import { UserSession, NotificationTemplateService } from '@novu/testing';
import {
  ChannelCTATypeEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterPartTypeEnum,
  StepTypeEnum,
  TemplateVariableTypeEnum,
  TriggerTypeEnum,
} from '@novu/shared';

describe('Get workflows - /workflows (GET)', async () => {
  let session: UserSession;
  const templates: NotificationTemplateEntity[] = [];
  let notificationTemplateService: NotificationTemplateService;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );

    templates.push(
      await notificationTemplateService.createTemplate({
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Test content for <b>{{firstName}}</b>',
            cta: {
              type: ChannelCTATypeEnum.REDIRECT,
              data: {
                url: '/cypress/test-shell/example/test?test-param=true',
              },
            },
            variables: [
              {
                defaultValue: '',
                name: 'firstName',
                required: false,
                type: TemplateVariableTypeEnum.STRING,
              },
            ],
            variants: [
              {
                name: 'In-App',
                subject: 'test',
                type: StepTypeEnum.IN_APP,
                content: '',
                contentType: 'editor',
                variables: [],
                active: true,
                filters: [
                  {
                    value: FieldLogicalOperatorEnum.OR,
                    children: [
                      {
                        operator: FieldOperatorEnum.EQUAL,
                        on: FilterPartTypeEnum.PAYLOAD,
                        field: 'ef',
                        value: 'dsf',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
    );
    templates.push(await notificationTemplateService.createTemplate());
    templates.push(await notificationTemplateService.createTemplate());
  });

  it('should return all workflows for organization', async () => {
    const { body } = await session.testAgent.get(`/v1/workflows`);

    expect(body.data.length).to.equal(3);

    const found = body.data.find((i) => templates[0]._id === i._id);

    expect(found).to.be.ok;
    expect(found.name).to.equal(templates[0].name);
    expect(found.notificationGroup.name).to.equal('General');
  });

  it('should not include variants data in the response', async () => {
    const { body } = await session.testAgent.get(`/v1/workflows`);

    expect(body.data.length).to.equal(3);

    const found = body.data.find((i) => templates[0]._id === i._id);

    expect(found).to.be.ok;
    expect(found.name).to.equal(templates[0].name);
    expect(found.notificationGroup.name).to.equal('General');
    expect(found.steps[0].variants).to.be.undefined;
  });

  it('should return all workflows as per pagination', async () => {
    templates.push(await notificationTemplateService.createTemplate());
    templates.push(await notificationTemplateService.createTemplate());
    templates.push(await notificationTemplateService.createTemplate());

    const { body: page0Limit2Results } = await session.testAgent.get(`/v1/workflows?page=0&limit=2`);

    expect(page0Limit2Results.data.length).to.equal(2);
    expect(page0Limit2Results.totalCount).to.equal(6);
    expect(page0Limit2Results.page).to.equal(0);
    expect(page0Limit2Results.pageSize).to.equal(2);
    expect(page0Limit2Results.data[0]._id).to.equal(templates[5]._id);

    const { body: page1Limit3Results } = await session.testAgent.get(`/v1/workflows?page=1&limit=3`);

    expect(page1Limit3Results.data.length).to.equal(3);
    expect(page1Limit3Results.totalCount).to.equal(6);
    expect(page1Limit3Results.page).to.equal(1);
    expect(page1Limit3Results.pageSize).to.equal(3);
    expect(page1Limit3Results.data[2]._id).to.equal(templates[0]._id);
  });

  it('should paginate and filter workflows based on the name', async () => {
    const promises: Promise<NotificationTemplateEntity>[] = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      promises.push(
        notificationTemplateService.createTemplate({
          name: `Pagination Test ${i}`,
        })
      );
    }
    await Promise.all(promises);

    const { body } = await session.testAgent.get(`/v1/workflows?page=0&limit=2&query=Pagination+Test`);

    expect(body.data.length).to.equal(2);
    expect(body.totalCount).to.equal(count);
    expect(body.page).to.equal(0);
    expect(body.pageSize).to.equal(2);
    for (let i = 0; i < 2; i++) {
      expect(body.data[i].name).to.contain('Pagination Test');
    }
  });

  it('should filter workflows based on the name', async () => {
    const promises: Promise<NotificationTemplateEntity>[] = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      promises.push(
        notificationTemplateService.createTemplate({
          name: `Test Template ${i}`,
        })
      );
    }
    await Promise.all(promises);

    const { body } = await session.testAgent.get(`/v1/workflows?page=0&limit=100&query=Test+Template`);

    expect(body.data.length).to.equal(count);
    expect(body.totalCount).to.equal(count);
    expect(body.page).to.equal(0);
    expect(body.pageSize).to.equal(100);
    for (let i = 0; i < count; i++) {
      expect(body.data[i].name).to.contain('Test Template');
    }
  });

  it('should filter workflows based on the trigger identifier', async () => {
    const promises: Promise<NotificationTemplateEntity>[] = [];
    const count = 10;
    const triggerIdentifier = 'test-trigger-identifier';
    for (let i = 0; i < count; i++) {
      promises.push(
        notificationTemplateService.createTemplate({
          triggers: [{ identifier: `${triggerIdentifier}-${i}`, type: TriggerTypeEnum.EVENT, variables: [] }],
        })
      );
    }
    await Promise.all(promises);

    const { body } = await session.testAgent.get(`/v1/workflows?page=0&limit=100&query=${triggerIdentifier}`);

    expect(body.data.length).to.equal(count);
    expect(body.totalCount).to.equal(count);
    expect(body.page).to.equal(0);
    expect(body.pageSize).to.equal(100);
    for (let i = 0; i < count; i++) {
      expect(body.data[i].triggers[0].identifier).to.contain(`${triggerIdentifier}`);
    }
  });

  it('should filter workflows based on both the name and trigger identifier', async () => {
    const promises: Promise<NotificationTemplateEntity>[] = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      if (i % 2 === 0) {
        promises.push(
          notificationTemplateService.createTemplate({
            name: Math.random() > 0.5 ? `SMS ${i}` : `sms ${i}`,
          })
        );
        continue;
      }

      promises.push(
        notificationTemplateService.createTemplate({
          triggers: [{ identifier: `sms-trigger-${i}`, type: TriggerTypeEnum.EVENT, variables: [] }],
        })
      );
    }
    await Promise.all(promises);

    const { body } = await session.testAgent.get(`/v1/workflows?page=0&limit=100&query=sms`);
    const nameCount = body.data.filter((i) => i.name.toUpperCase().includes('SMS')).length;
    const triggerCount = body.data.filter((i) => i.triggers[0].identifier.includes('sms')).length;

    expect(body.data.length).to.equal(count);
    expect(body.totalCount).to.equal(count);
    expect(body.page).to.equal(0);
    expect(body.pageSize).to.equal(100);
    expect(nameCount).to.equal(5);
    expect(triggerCount).to.equal(5);
  });
});
