import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { ContentTemplatesModule } from '../../content-templates.module';
import { CompileTemplate } from './compile-template.usecase';
import { CompileTemplateCommand } from './compile-template.command';

describe('Compile Template', function () {
  let useCase: CompileTemplate;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, ContentTemplatesModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<CompileTemplate>(CompileTemplate);
  });

  it('should render custom html', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        data: {
          branding: {
            color: '#e7e7e7e9',
          },
          name: 'Test Name',
        },
        customTemplate: '<div>{{name}}</div>',
      })
    );

    expect(result).to.equal('<div>Test Name</div>');
  });

  it('should compile basic template successfully', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        templateId: 'basic',
        data: {
          branding: {
            color: '#e7e7e7e9',
          },
          blocks: [
            {
              type: 'text',
              content: '<b>Hello TESTTTT content </b>',
            },
            {
              type: 'button',
              content: 'Button content of text',
            },
          ],
        },
      })
    );

    expect(result).to.contain('Hello TESTTTT content');
    expect(result).to.not.contain('{{#each blocks}}');
    expect(result).to.not.contains('ff6f61');
    expect(result).to.contain('#e7e7e7e9');
    expect(result).to.contain('Button content of text');
  });
});
