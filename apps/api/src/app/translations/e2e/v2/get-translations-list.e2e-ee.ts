import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { StepTypeEnum, WorkflowCreationSourceEnum, ApiServiceLevelEnum } from '@novu/shared';
import { LocalizationResourceEnum } from '@novu/dal';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get translations list - /v2/translations/list (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let workflowId1: string;
  let workflowId2: string;
  let workflowId3: string;

  beforeEach(async () => {
    // Enable translation feature for testing
    (process.env as any).IS_TRANSLATION_ENABLED = 'true';

    session = new UserSession();
    await session.initialize();

    // Set organization service level to business to avoid payment required errors
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    novuClient = initNovuClassSdkInternalAuth(session);

    // Create first workflow
    const { result: workflow1 } = await novuClient.workflows.create({
      name: 'User Onboarding Workflow',
      workflowId: `user-onboarding-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
      steps: [
        {
          name: 'Welcome Email',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Welcome to our platform',
            body: 'Welcome {{payload.name}}!',
          },
        },
      ],
    });
    workflowId1 = workflow1.workflowId;

    // Create second workflow
    const { result: workflow2 } = await novuClient.workflows.create({
      name: 'Order Confirmation Workflow',
      workflowId: `order-confirmation-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
      steps: [
        {
          name: 'Order Email',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Order confirmed',
            body: 'Your order #{{payload.orderId}} is confirmed',
          },
        },
      ],
    });
    workflowId2 = workflow2.workflowId;

    // Create third workflow
    const { result: workflow3 } = await novuClient.workflows.create({
      name: 'Password Reset Workflow',
      workflowId: `password-reset-workflow-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
      steps: [
        {
          name: 'Reset Email',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Reset your password',
            body: 'Click here to reset: {{payload.resetLink}}',
          },
        },
      ],
    });
    workflowId3 = workflow3.workflowId;

    // Create translations for different workflows and locales
    const translations = [
      // User Onboarding - Multiple locales
      {
        resourceId: workflowId1,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'welcome.title': 'Welcome to our platform',
          'welcome.message': 'Hello {{payload.name}}, welcome aboard!',
          'button.getStarted': 'Get Started',
        },
      },
      {
        resourceId: workflowId1,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'es_ES',
        content: {
          'welcome.title': 'Bienvenido a nuestra plataforma',
          'welcome.message': 'Hola {{payload.name}}, ¡bienvenido!',
          'button.getStarted': 'Empezar',
        },
      },
      {
        resourceId: workflowId1,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'fr_FR',
        content: {
          'welcome.title': 'Bienvenue sur notre plateforme',
          'welcome.message': 'Bonjour {{payload.name}}, bienvenue!',
          'button.getStarted': 'Commencer',
        },
      },
      // Order Confirmation - Two locales
      {
        resourceId: workflowId2,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'order.title': 'Order Confirmation',
          'order.message': 'Your order #{{payload.orderId}} has been confirmed',
          'order.total': 'Total: {{payload.total}}',
        },
      },
      {
        resourceId: workflowId2,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'de_DE',
        content: {
          'order.title': 'Bestellbestätigung',
          'order.message': 'Ihre Bestellung #{{payload.orderId}} wurde bestätigt',
          'order.total': 'Gesamt: {{payload.total}} EUR',
        },
      },
      // Password Reset - One locale
      {
        resourceId: workflowId3,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'reset.title': 'Password Reset',
          'reset.message': 'Click the link below to reset your password',
          'reset.button': 'Reset Password',
        },
      },
    ];

    // Create all translations
    for (const translation of translations) {
      await session.testAgent.post('/v2/translations').send(translation).expect(200);
    }
  });

  afterEach(() => {
    // Disable translation feature after each test
    (process.env as any).IS_TRANSLATION_ENABLED = 'false';
  });

  it('should get paginated list of translation groups without query', async () => {
    const { body } = await session.testAgent.get('/v2/translations/list').expect(200);

    expect(body.data).to.be.an('array');
    expect(body.total).to.be.a('number');
    expect(body.limit).to.equal(50); // Default limit
    expect(body.offset).to.equal(0); // Default offset

    // Should have 3 groups (one per workflow)
    expect(body.total).to.equal(3);
    expect(body.data).to.have.lengthOf(3);

    // Verify structure of translation groups
    body.data.forEach((group: any) => {
      expect(group).to.have.property('resourceId');
      expect(group).to.have.property('resourceType');
      expect(group).to.have.property('resourceName');
      expect(group).to.have.property('locales');
      expect(group).to.have.property('createdAt');
      expect(group).to.have.property('updatedAt');
      expect(group.locales).to.be.an('array');
      expect(group.resourceType).to.equal(LocalizationResourceEnum.WORKFLOW);
    });

    // Verify specific locale counts
    const onboardingGroup = body.data.find((group: any) => group.resourceId === workflowId1);
    const orderGroup = body.data.find((group: any) => group.resourceId === workflowId2);
    const resetGroup = body.data.find((group: any) => group.resourceId === workflowId3);

    expect(onboardingGroup.locales).to.have.lengthOf(3);
    expect(onboardingGroup.locales).to.include.members(['en_US', 'es_ES', 'fr_FR']);

    expect(orderGroup.locales).to.have.lengthOf(2);
    expect(orderGroup.locales).to.include.members(['en_US', 'de_DE']);

    expect(resetGroup.locales).to.have.lengthOf(1);
    expect(resetGroup.locales).to.include('en_US');
  });

  it('should handle pagination with custom limit and offset', async () => {
    // Get first page with limit 2
    const { body: page1 } = await session.testAgent.get('/v2/translations/list?limit=2&offset=0').expect(200);

    expect(page1.data).to.have.lengthOf(2);
    expect(page1.total).to.equal(3);
    expect(page1.limit).to.equal(2);
    expect(page1.offset).to.equal(0);

    // Get second page
    const { body: page2 } = await session.testAgent.get('/v2/translations/list?limit=2&offset=2').expect(200);

    expect(page2.data).to.have.lengthOf(1);
    expect(page2.total).to.equal(3);
    expect(page2.limit).to.equal(2);
    expect(page2.offset).to.equal(2);

    // Verify no overlap between pages
    const page1Ids = page1.data.map((group: any) => group.resourceId);
    const page2Ids = page2.data.map((group: any) => group.resourceId);
    const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));
    expect(intersection).to.have.lengthOf(0);

    // Verify locales are populated correctly in paginated results
    page1.data.forEach((group: any) => {
      expect(group.locales).to.be.an('array');
      expect(group.locales.length).to.be.greaterThan(0);
    });

    page2.data.forEach((group: any) => {
      expect(group.locales).to.be.an('array');
      expect(group.locales.length).to.be.greaterThan(0);
    });
  });

  it('should filter translation groups by search query matching workflow name', async () => {
    const { body } = await session.testAgent.get('/v2/translations/list?query=onboarding').expect(200);

    expect(body.data).to.have.lengthOf(1);
    expect(body.total).to.equal(1);

    const group = body.data[0];
    expect(group.resourceId).to.equal(workflowId1);
    expect(group.locales).to.be.an('array');
    expect(group.locales).to.have.lengthOf(3);
    expect(group.locales).to.include.members(['en_US', 'es_ES', 'fr_FR']);
  });

  it('should filter translation groups by search query matching workflow ID', async () => {
    // Search by partial workflow ID
    const searchTerm = workflowId2.split('-')[0]; // Get the prefix part
    const { body } = await session.testAgent.get(`/v2/translations/list?query=${searchTerm}`).expect(200);

    expect(body.data).to.have.lengthOf(1);
    expect(body.total).to.equal(1);
    expect(body.data[0].resourceId).to.equal(workflowId2);
    expect(body.data[0].locales).to.have.lengthOf(2);
    expect(body.data[0].locales).to.include.members(['en_US', 'de_DE']);
  });

  it('should return empty results for non-matching search query', async () => {
    const { body } = await session.testAgent.get('/v2/translations/list?query=nonexistent').expect(200);

    expect(body.data).to.have.lengthOf(0);
    expect(body.total).to.equal(0);
  });

  it('should handle case-insensitive search', async () => {
    const { body } = await session.testAgent.get('/v2/translations/list?query=ORDER').expect(200);

    expect(body.data).to.have.lengthOf(1);
    expect(body.total).to.equal(1);
    expect(body.data[0].resourceId).to.equal(workflowId2);
    expect(body.data[0].locales).to.have.lengthOf(2);
    expect(body.data[0].locales).to.include.members(['en_US', 'de_DE']);
  });

  it('should combine search query with pagination', async () => {
    // Create additional workflows to test pagination with search
    const { result: workflow4 } = await novuClient.workflows.create({
      name: 'User Onboarding Advanced Workflow',
      workflowId: `user-onboarding-advanced-${Date.now()}`,
      source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      isTranslationEnabled: true,
      steps: [
        {
          name: 'Advanced Welcome',
          type: StepTypeEnum.EMAIL,
          controlValues: {
            subject: 'Advanced welcome',
            body: 'Advanced onboarding process',
          },
        },
      ],
    });

    // Add translation for the new workflow
    await session.testAgent
      .post('/v2/translations')
      .send({
        resourceId: workflow4.workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: { 'advanced.welcome': 'Advanced Welcome' },
      })
      .expect(200);

    // Search for "onboarding" should now return 2 results
    const { body } = await session.testAgent.get('/v2/translations/list?query=onboarding&limit=1&offset=0').expect(200);

    expect(body.data).to.have.lengthOf(1);
    expect(body.total).to.equal(2);
    expect(body.limit).to.equal(1);
    expect(body.offset).to.equal(0);

    // Verify the returned group has locales
    expect(body.data[0].locales).to.be.an('array');
    expect(body.data[0].locales.length).to.be.greaterThan(0);
  });

  it('should return correct locale counts for each translation group', async () => {
    const { body } = await session.testAgent.get('/v2/translations/list').expect(200);

    // Find the user onboarding workflow
    const onboardingGroup = body.data.find((group: any) => group.resourceId === workflowId1);
    expect(onboardingGroup).to.exist;
    expect(onboardingGroup.locales).to.be.an('array');
    expect(onboardingGroup.locales).to.have.lengthOf(3);
    expect(onboardingGroup.locales).to.include.members(['en_US', 'es_ES', 'fr_FR']);

    // Find the order confirmation workflow
    const orderGroup = body.data.find((group: any) => group.resourceId === workflowId2);
    expect(orderGroup).to.exist;
    expect(orderGroup.locales).to.be.an('array');
    expect(orderGroup.locales).to.have.lengthOf(2);
    expect(orderGroup.locales).to.include.members(['en_US', 'de_DE']);

    // Find the password reset workflow
    const resetGroup = body.data.find((group: any) => group.resourceId === workflowId3);
    expect(resetGroup).to.exist;
    expect(resetGroup.locales).to.be.an('array');
    expect(resetGroup.locales).to.have.lengthOf(1);
    expect(resetGroup.locales).to.include('en_US');
  });

  it('should handle large offset gracefully', async () => {
    const { body } = await session.testAgent.get('/v2/translations/list?offset=1000').expect(200);

    expect(body.data).to.have.lengthOf(0);
    expect(body.total).to.equal(3);
    expect(body.offset).to.equal(1000);
  });

  it('should validate limit parameter bounds', async () => {
    // Test with limit = 10 (should work)
    const { body: smallLimit } = await session.testAgent.get('/v2/translations/list?limit=10').expect(200);

    expect(smallLimit.data).to.have.lengthOf(3); // Only 3 items available
    expect(smallLimit.limit).to.equal(10);

    // Verify locales are populated
    smallLimit.data.forEach((group: any) => {
      expect(group.locales).to.be.an('array');
      expect(group.locales.length).to.be.greaterThan(0);
    });

    const { body: largeLimit } = await session.testAgent.get('/v2/translations/list?limit=100').expect(200);

    expect(largeLimit.data).to.have.lengthOf(3); // Should return all available
    expect(largeLimit.limit).to.equal(100);

    // Verify locales are populated
    largeLimit.data.forEach((group: any) => {
      expect(group.locales).to.be.an('array');
      expect(group.locales.length).to.be.greaterThan(0);
    });
  });
});
