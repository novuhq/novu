import { expect } from 'chai';
import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { ChannelTypeEnum, EmailBlockTypeEnum } from '@novu/shared';
import { LayoutRepository, OrganizationRepository, DalService } from '@novu/dal';

import { CompileEmailTemplate } from '@novu/application-generic';
import { CompileEmailTemplateCommand } from '@novu/application-generic';
import { CompileTemplate } from '@novu/application-generic';
import { GetLayoutUseCase } from '@novu/application-generic';
import { GetNovuLayout } from '@novu/application-generic';

const dalService = new DalService();

describe('Compile E-mail Template', function () {
  let useCase: CompileEmailTemplate;
  let session: UserSession;
  const layoutRepository = new LayoutRepository();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [
        CompileEmailTemplate,
        CompileTemplate,
        GetLayoutUseCase,
        GetNovuLayout,
        OrganizationRepository,
        LayoutRepository,
        {
          provide: DalService,
          useFactory: async () => {
            await dalService.connect(process.env.MONGO_URL);

            return dalService;
          },
        },
      ],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<CompileEmailTemplate>(CompileEmailTemplate);
  });

  it('should compile a template with custom layout defined', async function () {
    const layout = await layoutRepository.create({
      name: 'Test Layout',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _creatorId: session.user._id as string,
      content: '<div>An layout wrapper <div>{{{body}}}</div></div>',
      isDefault: true,
      deleted: false,
      channel: ChannelTypeEnum.EMAIL,
    });

    const { html, subject } = await useCase.execute(
      CompileEmailTemplateCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        layoutId: layout._id,
        preheader: null,
        content: '<div>{{name}}</div>',
        payload: { name: 'Test', header: 'Header Test' },
        userId: session.user._id,
        contentType: 'customHtml',
        subject: 'A title for {{header}}',
      })
    );

    expect(html).to.equal('<div>An layout wrapper <div><div>Test</div></div></div>');
    expect(subject).to.equal('A title for Header Test');
  });

  it('should compile a template with custom layout defined for visual editor', async function () {
    const layout = await layoutRepository.create({
      name: 'Test Layout',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _creatorId: session.user._id as string,
      content: '<div>An layout wrapper <div>{{{body}}}</div></div>',
      isDefault: true,
      deleted: false,
      channel: ChannelTypeEnum.EMAIL,
    });

    const { html, subject } = await useCase.execute(
      CompileEmailTemplateCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        layoutId: layout._id,
        preheader: null,
        content: [
          {
            content: '<div>{{name}}</div>',
            type: EmailBlockTypeEnum.TEXT,
          },
        ],
        payload: { name: 'Test', header: 'Header Test' },
        userId: session.user._id,
        contentType: 'editor',
        subject: 'A title for {{header}}',
      })
    );

    expect(html).to.contain('<div>An layout wrapper <div>');
    expect(html).to.contain('<div>Test</div>');
    expect(html).not.to.contain('{{');

    expect(subject).to.equal('A title for Header Test');
  });

  it('should apply subject variable if provided', async function () {
    const subjectText = 'Novu Test';
    const { html, subject } = await useCase.execute(
      CompileEmailTemplateCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        layoutId: null,
        preheader: null,
        content: [
          {
            content: '<p>{{subject}}</p>',
            type: EmailBlockTypeEnum.TEXT,
          },
        ],
        payload: { subject: subjectText },
        userId: session.user._id,
        contentType: 'editor',
        subject: '{{subject}}',
      })
    );

    expect(html).to.contain('<!DOCTYPE html');
    expect(html).not.to.contain('{{subject}}');
    expect(html).to.contain(`<p>${subjectText}</p>`);

    expect(subject).to.equal(subjectText);
  });

  it('should apply sender name variable if provided', async function () {
    const senderNameTest = 'Novu Test';
    const { html, senderName } = await useCase.execute(
      CompileEmailTemplateCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        layoutId: null,
        preheader: null,
        content: [
          {
            content: '<p>{{senderName}}</p>',
            type: EmailBlockTypeEnum.TEXT,
          },
        ],
        payload: { senderName: senderNameTest },
        userId: session.user._id,
        contentType: 'editor',
        subject: 'sub',
        senderName: '{{senderName}}',
      })
    );

    expect(html).to.contain('<!DOCTYPE html');
    expect(html).not.to.contain('{{senderName}}');
    expect(html).to.contain(`<p>${senderNameTest}</p>`);

    expect(senderName).to.equal(senderNameTest);
  });

  describe('Backwards compatability', function () {
    it('should compile e-mail template for custom html without layouts attached for backwards compatability', async function () {
      const { html, subject } = await useCase.execute(
        CompileEmailTemplateCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          layoutId: null,
          preheader: null,
          content: '<div>{{name}}</div>',
          payload: { name: 'Test', header: 'Header Test' },
          userId: session.user._id,
          contentType: 'customHtml',
          subject: 'A title for {{header}}',
        })
      );

      expect(html).to.equal('<div>Test</div>');
      expect(subject).to.equal('A title for Header Test');
    });

    it('should add default novu layout for visual editor templates', async function () {
      const { html, subject } = await useCase.execute(
        CompileEmailTemplateCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          layoutId: null,
          preheader: null,
          content: [
            {
              content: '<div>{{name}}</div>',
              type: EmailBlockTypeEnum.TEXT,
            },
          ],
          payload: { name: 'Test', header: 'Header Test' },
          userId: session.user._id,
          contentType: 'editor',
          subject: 'A title for {{header}}',
        })
      );

      expect(html).to.contain('<!DOCTYPE html');
      expect(html).not.to.contain('{{name}}');
      expect(html).to.contain('<div>Test</div>');

      expect(subject).to.equal('A title for Header Test');
    });
  });
});
