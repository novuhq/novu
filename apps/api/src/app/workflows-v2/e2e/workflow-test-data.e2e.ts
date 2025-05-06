import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { Novu } from '@novu/api';
import {
  CreateWorkflowDto,
  StepTypeEnum,
  WorkflowCreationSourceEnum,
  WorkflowTestDataResponseDto,
} from '@novu/api/models/components';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

interface ITestStepConfig {
  type: StepTypeEnum;
  controlValues: Record<string, string>;
}

describe('Workflow Test Data', function () {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  describe('GET /v2/workflows/:workflowId/test-data #novu-v2', () => {
    describe('single step workflows', () => {
      it('should generate correct schema for email notification', async () => {
        const emailStep: ITestStepConfig = {
          type: StepTypeEnum.Email,
          controlValues: {
            subject: 'Welcome {{payload.user.name}}',
            body: 'Hello {{payload.user.name}}, your order {{payload.order.details.orderId}} is ready',
          },
        };

        const { testData } = await createAndFetchTestData(emailStep);

        expect(testData.payload.type).to.equal('object');
        expect((testData as any).payload.properties.user.type).to.equal('object');
        expect((testData as any).payload.properties.user.properties).to.have.property('name');
        expect((testData as any).payload.properties.order.type).to.equal('object');
        expect((testData as any).payload.properties.order.properties.details.type).to.equal('object');
        expect((testData as any).payload.properties.order.properties.details.properties).to.have.property('orderId');

        expect(testData.to.type).to.equal('object');
        expect(testData.to.properties).to.have.property('email');
        expect(testData.to.properties).to.have.property('subscriberId');
      });

      it('should generate correct schema for SMS notification', async () => {
        const smsStep: ITestStepConfig = {
          type: StepTypeEnum.Sms,
          controlValues: {
            content: 'Your verification code is {{payload.code}}',
          },
        };

        const { testData } = await createAndFetchTestData(smsStep);

        expect(testData.payload.type).to.equal('object');
        expect(testData.payload.properties).to.have.property('code');

        expect(testData.to.type).to.equal('object');
        expect(testData.to.properties).to.have.property('phone');
        expect(testData.to.properties).to.have.property('subscriberId');
      });

      it('should generate correct schema for in-app notification', async () => {
        const inAppStep: ITestStepConfig = {
          type: StepTypeEnum.InApp,
          controlValues: {
            content: 'New message from {{payload.sender}}',
          },
        };

        const { testData } = await createAndFetchTestData(inAppStep);

        expect(testData.payload.type).to.equal('object');
        expect(testData.payload.properties).to.have.property('sender');

        expect(testData.to).to.be.an('object');
        expect(testData.to.type).to.equal('object');
        expect(testData.to.properties).to.have.property('subscriberId');
        expect(testData.to.properties).to.not.have.property('email');
        expect(testData.to.properties).to.not.have.property('phone');
      });
    });

    describe('multi-step workflows', () => {
      it('should combine variables from multiple notification steps', async () => {
        const steps: ITestStepConfig[] = [
          {
            type: StepTypeEnum.Email,
            controlValues: {
              subject: 'Order {{payload.orderId}}',
              body: 'Status: {{payload.status}}',
            },
          },
          {
            type: StepTypeEnum.Sms,
            controlValues: {
              content: 'Order {{payload.orderId}} update: {{payload.smsUpdate}}',
            },
          },
        ];

        const { testData } = await createAndFetchTestData(steps);

        expect(testData.payload.type).to.equal('object');
        expect(testData.payload.properties).to.have.all.keys('orderId', 'status', 'smsUpdate');

        expect(testData.to.type).to.equal('object');
        expect(testData.to.properties).to.have.all.keys('subscriberId', 'email', 'phone');
      });
    });

    describe('edge cases', () => {
      it('should handle workflow with no steps', async () => {
        const { testData } = await createAndFetchTestData([]);

        expect(testData.payload).to.deep.equal({});
        expect(testData.to.properties).to.have.property('subscriberId');
      });
    });
  });

  async function createAndFetchTestData(
    stepsConfig: ITestStepConfig | ITestStepConfig[]
  ): Promise<{ workflow: any; testData: WorkflowTestDataResponseDto }> {
    const steps = Array.isArray(stepsConfig) ? stepsConfig : [stepsConfig];
    const workflow = await createWorkflow(steps);
    const testData = await getWorkflowTestData(workflow.id);

    return { workflow, testData };
  }

  async function createWorkflow(steps: ITestStepConfig[]) {
    const createWorkflowDto: CreateWorkflowDto = {
      name: 'Test Workflow',
      workflowId: `test-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.Editor,
      active: true,
      steps: steps.map(({ type, ...rest }, index) => ({
        ...rest,
        name: `Test Step ${index + 1}`,
        type,
      })),
    };

    const { result } = await novuClient.workflows.create(createWorkflowDto);

    return result;
  }

  async function getWorkflowTestData(workflowId: string): Promise<WorkflowTestDataResponseDto> {
    const { result } = await novuClient.workflows.getTestData(workflowId);

    return result;
  }
});
