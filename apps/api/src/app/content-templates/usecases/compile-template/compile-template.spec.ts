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

  it('should render pluralisation in html', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        data: {
          branding: {
            color: '#e7e7e7e9',
          },
          dog_count: 1,
          sausage_count: 2,
        },
        customTemplate:
          '<div>{{dog_count}} {{pluralize dog_count "dog" "dogs"}} and {{sausage_count}} {{pluralize sausage_count "sausage" "sausages"}} for {{pluralize dog_count "him" "them"}}</div>',
      })
    );

    expect(result).to.equal('<div>1 dog and 2 sausages for him</div>');
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

  it('should include text align for text blocks', async function () {
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
              styles: {
                textAlign: 'center',
              },
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

    expect(result).to.contain('text-align: center');
  });

  it('should allow the user to specify handlebars helpers', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        data: {
          branding: {
            color: '#e7e7e7e9',
          },
          message: 'hello world',
          messageTwo: 'hEllo world',
        },
        customTemplate: '<div>{{titlecase message}} and {{lowercase messageTwo}} and {{uppercase message}}</div>',
      })
    );

    expect(result).to.equal('<div>Hello World and hello world and HELLO WORLD</div>');
  });

  describe('Date Formation', function () {
    it('should allow user to format the date', async function () {
      const result = await useCase.execute(
        CompileTemplateCommand.create({
          templateId: 'custom',
          data: {
            date: '2020-01-01',
          },
          customTemplate: "<div>{{dateFormat date 'EEEE, MMMM Do yyyy'}}</div>",
        })
      );
      expect(result).to.equal('<div>Wednesday, January 1st 2020</div>');
    });

    it('should not fail and return same date for invalid date', async function () {
      const result = await useCase.execute(
        CompileTemplateCommand.create({
          templateId: 'custom',
          data: {
            date: 'ABCD',
          },
          customTemplate: "<div>{{dateFormat date 'EEEE, MMMM Do yyyy'}}</div>",
        })
      );
      expect(result).to.equal('<div>ABCD</div>');
    });
  });
});
