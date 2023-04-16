import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';

import { CompileTemplate } from './compile-template.usecase';
import { CompileTemplateCommand } from './compile-template.command';

describe('Compile Template', function () {
  let useCase: CompileTemplate;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CompileTemplate],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<CompileTemplate>(CompileTemplate);
  });

  it('should render custom html', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        data: {
          branding: {
            color: '#e7e7e7e9',
          },
          name: 'Test Name',
        },
        template: '<div>{{name}}</div>',
      })
    );

    expect(result).toEqual('<div>Test Name</div>');
  });

  it('should render pluralisation in html', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        data: {
          branding: {
            color: '#e7e7e7e9',
          },
          dog_count: 1,
          sausage_count: 2,
        },
        template:
          '<div>{{dog_count}} {{pluralize dog_count "dog" "dogs"}} and {{sausage_count}} {{pluralize sausage_count "sausage" "sausages"}} for {{pluralize dog_count "him" "them"}}</div>',
      })
    );

    expect(result).toEqual('<div>1 dog and 2 sausages for him</div>');
  });

  it('should allow the user to specify handlebars helpers', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        data: {
          branding: {
            color: '#e7e7e7e9',
          },
          message: 'hello world',
          messageTwo: 'hEllo world',
        },
        template:
          '<div>{{titlecase message}} and {{lowercase messageTwo}} and {{uppercase message}}</div>',
      })
    );

    expect(result).toEqual(
      '<div>Hello World and hello world and HELLO WORLD</div>'
    );
  });

  it('should allow apostrophes to be in data', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        data: {
          message: "hello' world",
        },
        template: '<div>{{message}}</div>',
      })
    );

    expect(result).toEqual("<div>hello' world</div>");
  });

  describe('Date Formation', function () {
    it('should allow user to format the date', async function () {
      const result = await useCase.execute(
        CompileTemplateCommand.create({
          data: {
            date: '2020-01-01',
          },
          template: "<div>{{dateFormat date 'EEEE, MMMM Do yyyy'}}</div>",
        })
      );
      expect(result).toEqual('<div>Wednesday, January 1st 2020</div>');
    });

    it('should not fail and return same date for invalid date', async function () {
      const result = await useCase.execute(
        CompileTemplateCommand.create({
          data: {
            date: 'ABCD',
          },
          template: "<div>{{dateFormat date 'EEEE, MMMM Do yyyy'}}</div>",
        })
      );
      expect(result).toEqual('<div>ABCD</div>');
    });
  });
});
