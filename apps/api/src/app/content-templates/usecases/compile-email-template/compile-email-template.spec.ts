import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { ContentTemplatesModule } from '../../content-templates.module';
import { CompileEmailTemplate } from './compile-email-template.usecase';
import { CompileEmailTemplateCommand } from './compile-email-template.command';
import { ChannelTypeEnum, EmailBlockTypeEnum, ITemplateVariable } from '@novu/shared';
import { LayoutRepository } from '@novu/dal';

describe('Compile E-mail Template', function () {
  let useCase: CompileEmailTemplate;
  let session: UserSession;
  const layoutRepository = new LayoutRepository();
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, ContentTemplatesModule],
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
    expect(html).to.not.contain('{{');

    expect(subject).to.equal('A title for Header Test');
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
      expect(html).to.not.contain('{{name}}');
      expect(html).to.contain('<div>Test</div>');

      expect(subject).to.equal('A title for Header Test');
    });
  });
});
