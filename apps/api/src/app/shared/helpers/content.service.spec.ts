import { ContentService } from '@novu/application-generic';
import {
  DelayTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterPartTypeEnum,
  INotificationTemplateStep,
  StepTypeEnum,
  TriggerContextTypeEnum,
} from '@novu/shared';
import { expect } from 'chai';

describe('ContentService', () => {
  describe('replaceVariables', () => {
    it('should replace duplicates entries', () => {
      const variables = {
        firstName: 'Name',
        lastName: 'Last Name',
      };

      const contentService = new ContentService();
      const modified = contentService.replaceVariables(
        '{{firstName}} is the first {{firstName}} of {{firstName}}',
        variables
      );
      expect(modified).to.equal('Name is the first Name of Name');
    });

    it('should replace multiple variables', () => {
      const variables = {
        firstName: 'Name',
        $last_name: 'Last Name',
      };

      const contentService = new ContentService();
      const modified = contentService.replaceVariables(
        '{{firstName}} is the first {{$last_name}} of {{firstName}}',
        variables
      );
      expect(modified).to.equal('Name is the first Last Name of Name');
    });

    it('should not manipulate variables for text without them', () => {
      const variables = {
        firstName: 'Name',
        lastName: 'Last Name',
      };

      const contentService = new ContentService();
      const modified = contentService.replaceVariables('This is a text without variables', variables);
      expect(modified).to.equal('This is a text without variables');
    });
  });

  describe('extractVariables', () => {
    it('should not find any variables', () => {
      const contentService = new ContentService();
      try {
        contentService.extractVariables('This is a text without variables {{ invalid }} {{ not valid{ {var}}');
        expect(true).to.equal(false);
      } catch (e) {
        expect(e.response.message).to.equal('Failed to extract variables');
      }
    });

    it('should extract all valid variables', () => {
      const contentService = new ContentService();
      const extractVariables = contentService.extractVariables(
        ' {{name}} d {{lastName}} dd {{_validName}} {{not valid}} aa {{0notValid}}tr {{organization_name}}'
      );
      const variablesNames = extractVariables.map((variable) => variable.name);

      expect(extractVariables.length).to.equal(4);
      expect(variablesNames).to.include('_validName');
      expect(variablesNames).to.include('lastName');
      expect(variablesNames).to.include('name');
      expect(variablesNames).to.include('organization_name');
    });

    it('should correctly extract variables related to registered handlebar helpers', () => {
      const contentService = new ContentService();
      const extractVariables = contentService.extractVariables(' {{titlecase word}}');

      expect(extractVariables.length).to.equal(1);
      expect(extractVariables[0].name).to.include('word');
    });

    it('should not show @data variables ', () => {
      const contentService = new ContentService();
      const extractVariables = contentService.extractVariables(
        ' {{#each array}} {{@index}} {{#if @first}} First {{/if}} {{name}} {{/each}}'
      );

      expect(extractVariables.length).to.equal(2);
      expect(extractVariables[0].name).to.include('array');
      expect(extractVariables[0].type).to.eq('Array');
      expect(extractVariables[1].name).to.include('name');
    });
  });

  describe('extractMessageVariables', () => {
    it('should not extract variables', () => {
      const contentService = new ContentService();
      const { variables } = contentService.extractMessageVariables([
        {
          template: {
            type: StepTypeEnum.IN_APP,
            subject: 'Test',
            content: 'Text',
          },
        },
      ]);
      expect(variables.length).to.equal(0);
    });

    it('should extract subject variables', () => {
      const contentService = new ContentService();
      const { variables } = contentService.extractMessageVariables([
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{firstName}}',
            content: [],
          },
        },
      ]);
      expect(variables.length).to.equal(1);
      expect(variables[0].name).to.include('firstName');
    });

    it('should extract reserved variables', () => {
      const contentService = new ContentService();
      const { variables, reservedVariables } = contentService.extractMessageVariables([
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{firstName}} {{tenant.name}}',
            content: [],
          },
        },
      ]);
      expect(variables.length).to.equal(1);
      expect(variables[0].name).to.include('firstName');
      expect(reservedVariables.length).to.equal(1);
      expect(reservedVariables[0].type).to.eq(TriggerContextTypeEnum.TENANT);
      expect(reservedVariables[0].variables[0].name).to.include('identifier');
    });

    it('should add phone when SMS channel Exists', () => {
      const contentService = new ContentService();
      const variables = contentService.extractSubscriberMessageVariables([
        {
          template: {
            type: StepTypeEnum.IN_APP,
            subject: 'Test',
            content: 'Text',
          },
        },
        {
          template: {
            type: StepTypeEnum.SMS,
            content: 'Text',
          },
        },
      ]);
      expect(variables.length).to.equal(1);
      expect(variables[0]).to.equal('phone');
    });

    it('should add email when EMAIL channel Exists', () => {
      const contentService = new ContentService();
      const variables = contentService.extractSubscriberMessageVariables([
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test',
            content: 'Text',
          },
        },
        {
          template: {
            type: StepTypeEnum.IN_APP,
            content: 'Text',
          },
        },
      ]);
      expect(variables.length).to.equal(1);
      expect(variables[0]).to.equal('email');
    });

    it('should extract email content variables', () => {
      const contentService = new ContentService();
      const messages = [
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{firstName}}',
            content: [
              {
                content: 'Test of {{lastName}}',
                type: 'text',
              },
              {
                content: 'Test of {{lastName}}',
                type: 'text',
                url: 'Test of {{url}}',
              },
            ],
          },
        },
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{email}}',
            content: [
              {
                content: 'Test of {{lastName}}',
                type: 'text',
              },
              {
                content: 'Test of {{lastName}}',
                type: 'text',
                url: 'Test of {{url}}',
              },
            ],
          },
        },
      ] as INotificationTemplateStep[];

      const { variables } = contentService.extractMessageVariables(messages);
      const subscriberVariables = contentService.extractSubscriberMessageVariables(messages);
      const variablesNames = variables.map((variable) => variable.name);

      expect(variables.length).to.equal(4);
      expect(subscriberVariables.length).to.equal(1);
      expect(variablesNames).to.include('lastName');
      expect(variablesNames).to.include('url');
      expect(variablesNames).to.include('firstName');
      expect(subscriberVariables).to.include('email');
    });

    it('should extract in-app content variables', () => {
      const contentService = new ContentService();
      const { variables } = contentService.extractMessageVariables([
        {
          template: {
            type: StepTypeEnum.IN_APP,
            content: '{{customVariables}}',
          },
        },
      ]);

      expect(variables.length).to.equal(1);
      expect(variables[0].name).to.include('customVariables');
    });

    it('should extract i18n content variables', () => {
      const contentService = new ContentService();
      const { variables } = contentService.extractMessageVariables([
        {
          template: {
            type: StepTypeEnum.IN_APP,
            content: '{{i18n "group.key" var=customVar.subVar var2=secVar}}',
          },
        },
      ]);

      expect(variables.length).to.equal(2);

      const variablesNames = variables.map((variable) => variable.name);
      expect(variablesNames).to.include('customVar.subVar');
      expect(variablesNames).to.include('secVar');
    });

    it('should extract action steps variables', () => {
      const contentService = new ContentService();
      const { variables } = contentService.extractMessageVariables([
        {
          template: {
            type: StepTypeEnum.DELAY,
            content: '',
          },
          metadata: { type: DelayTypeEnum.SCHEDULED, delayPath: 'sendAt' },
        },
        {
          template: {
            type: StepTypeEnum.DIGEST,
            content: '',
          },
          metadata: { type: DigestTypeEnum.REGULAR, digestKey: 'path', unit: DigestUnitEnum.SECONDS, amount: 1 },
        },
      ]);

      const variablesNames = variables.map((variable) => variable.name);

      expect(variables.length).to.equal(2);
      expect(variablesNames).to.include('sendAt');
      expect(variablesNames).to.include('path');
    });

    it('should extract filter variables on payload', () => {
      const contentService = new ContentService();
      const { variables } = contentService.extractMessageVariables([
        {
          template: {
            type: StepTypeEnum.EMAIL,
            content: '{{name}}',
          },
          filters: [
            {
              isNegated: false,
              type: 'GROUP',
              value: FieldLogicalOperatorEnum.AND,
              children: [
                {
                  on: FilterPartTypeEnum.PAYLOAD,
                  field: 'counter',
                  value: 'test value',
                  operator: FieldOperatorEnum.EQUAL,
                },
              ],
            },
          ],
        },
      ]);

      const variablesNames = variables.map((variable) => variable.name);

      expect(variables.length).to.equal(2);
      expect(variablesNames).to.include('name');
      expect(variablesNames).to.include('counter');
    });

    it('should not extract variables reserved for the system', () => {
      const contentService = new ContentService();
      const messages = [
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{subscriber.firstName}}',
            content: [
              {
                content: 'Test of {{subscriber.firstName}} {{lastName}}',
                type: 'text',
              },
            ],
          },
        },
      ] as INotificationTemplateStep[];
      const { variables: extractVariables } = contentService.extractMessageVariables(messages);

      expect(extractVariables.length).to.equal(1);
      expect(extractVariables[0].name).to.include('lastName');
    });
  });

  describe('extractStepVariables', () => {
    it('should not fail if no filters available', () => {
      const contentService = new ContentService();
      const messages = [
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{subscriber.firstName}}',
            content: [
              {
                content: 'Test of {{subscriber.firstName}} {{lastName}}',
                type: 'text',
              },
            ],
          },
        },
      ] as INotificationTemplateStep[];
      const variables = contentService.extractStepVariables(messages);

      expect(variables.length).to.equal(0);
    });

    it('should not fail if filters are set as non array', () => {
      const contentService = new ContentService();
      const messages = [
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{subscriber.firstName}}',
            content: [
              {
                content: 'Test of {{subscriber.firstName}} {{lastName}}',
                type: 'text',
              },
            ],
          },
          filters: {},
        },
      ] as INotificationTemplateStep[];
      const variables = contentService.extractStepVariables(messages);

      expect(variables.length).to.equal(0);
    });

    it('should not fail if filters are an empty array', () => {
      const contentService = new ContentService();
      const messages = [
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{subscriber.firstName}}',
            content: [
              {
                content: 'Test of {{subscriber.firstName}} {{lastName}}',
                type: 'text',
              },
            ],
          },
          filters: [],
        },
      ] as INotificationTemplateStep[];
      const variables = contentService.extractStepVariables(messages);

      expect(variables.length).to.equal(0);
    });

    it('should not fail if filters have some wrong settings like missing children in filters', () => {
      const contentService = new ContentService();
      const messages = [
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{subscriber.firstName}}',
            content: [
              {
                content: 'Test of {{subscriber.firstName}} {{lastName}}',
                type: 'text',
              },
            ],
          },
          filters: [
            {
              isNegated: false,
              type: 'GROUP',
              value: FieldLogicalOperatorEnum.AND,
            },
          ],
        },
      ] as INotificationTemplateStep[];
      const variables = contentService.extractStepVariables(messages);

      expect(variables.length).to.equal(0);
    });
  });
});
