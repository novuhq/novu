import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { ChannelTypeEnum, EmailBlockTypeEnum } from '@novu/shared';
import { LayoutRepository, OrganizationRepository } from '@novu/dal';

import { CompileEmailTemplate } from './compile-email-template.usecase';
import { CompileEmailTemplateCommand } from './compile-email-template.command';
import { CompileTemplate } from '../compile-template';
import { GetLayoutUseCase } from '../get-layout';
import { GetNovuLayout } from '../get-novu-layout';

describe('Compile E-mail Template', function () {
  let useCase: CompileEmailTemplate;
  let session: UserSession;
  const layoutRepository = new LayoutRepository();
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        CompileEmailTemplate,
        CompileTemplate,
        GetLayoutUseCase,
        GetNovuLayout,
        OrganizationRepository,
        LayoutRepository,
      ],
      providers: [],
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

    expect(html).toEqual(
      '<div>An layout wrapper <div><div>Test</div></div></div>'
    );
    expect(subject).toEqual('A title for Header Test');
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

    expect(html).toContain('<div>An layout wrapper <div>');
    expect(html).toContain('<div>Test</div>');
    expect(html).not.toContain('{{');

    expect(subject).toEqual('A title for Header Test');
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

    expect(html).toContain('<!DOCTYPE html');
    expect(html).not.toContain('{{subject}}');
    expect(html).toContain(`<p>${subjectText}</p>`);

    expect(subject).toEqual(subjectText);
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

      expect(html).toEqual('<div>Test</div>');
      expect(subject).toEqual('A title for Header Test');
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

      expect(html).toContain('<!DOCTYPE html');
      expect(html).not.toContain('{{name}}');
      expect(html).toContain('<div>Test</div>');

      expect(subject).toEqual('A title for Header Test');
    });
  });
});
