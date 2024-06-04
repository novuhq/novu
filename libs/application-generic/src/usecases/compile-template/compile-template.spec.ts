import { Test } from '@nestjs/testing';

import { CompileTemplate } from './compile-template.usecase';
import { CompileTemplateCommand } from './compile-template.command';

describe('Compile Template', function () {
  let useCase: CompileTemplate;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [CompileTemplate],
    }).compile();

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

  it('should render unique values of array', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        data: {
          names: [{ name: 'dog' }, { name: 'cat' }, { name: 'dog' }],
        },
        template:
          '<div>{{#each (unique names "name")}}{{this}}-{{/each}}</div>',
      })
    );

    expect(result).toEqual('<div>dog-cat-</div>');
  });

  it('should render groupBy values of array', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        data: {
          names: [
            {
              name: 'Name 1',
              age: '30',
            },
            {
              name: 'Name 2',
              age: '31',
            },
            {
              name: 'Name 1',
              age: '32',
            },
          ],
        },
        template:
          '{{#each (groupBy names "name")}}<h1>{{key}}</h1>{{#each items}}{{age}}-{{/each}}{{/each}}',
      })
    );

    expect(result).toEqual('<h1>Name 1</h1>30-32-<h1>Name 2</h1>31-');
  });

  it('should render sortBy values of array', async function () {
    const result = await useCase.execute(
      CompileTemplateCommand.create({
        data: {
          people: [
            {
              name: 'a75',
              item1: false,
              item2: false,
              id: 1,
              updated_at: '2023-01-01T06:25:24Z',
            },
            {
              name: 'z32',
              item1: true,
              item2: false,
              id: 3,
              updated_at: '2023-01-09T11:25:13Z',
            },
            {
              name: 'e77',
              item1: false,
              item2: false,
              id: 2,
              updated_at: '2023-01-05T04:13:24Z',
            },
          ],
        },
        template: `{{#each (sortBy people 'updated_at')}}{{name}} - {{id}}{{/each}}`,
      })
    );

    expect(result).toEqual('a75 - 1e77 - 2z32 - 3');
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

  describe('Number formating', () => {
    it('should format number', async () => {
      const result = await useCase.execute(
        CompileTemplateCommand.create({
          data: { number: 1000000000 },
          template:
            '<div>{{numberFormat number decimalSep="," decimalLength="2" thousandsSep="|"}}</div>',
        })
      );

      expect(result).toEqual('<div>1|000|000|000,00</div>');
    });

    it('should not fail and return passed value', async () => {
      const result = await useCase.execute(
        CompileTemplateCommand.create({
          data: { number: 'Not a number' },
          template:
            '<div>{{numberFormat number decimalSep="," decimalLength="2" thousandsSep="|"}}</div>',
        })
      );

      expect(result).toEqual('<div>Not a number</div>');
    });
  });

  describe('gt helper', () => {
    const template = `{{#gt steps 5 }}<span>gt block</span>{{else}}<span>else block</span>{{/gt}}`;
    it('shoud render gt block', async () => {
      const result = await useCase.execute({
        data: { steps: 6 },
        template,
      });

      expect(result).toEqual('<span>gt block</span>');
    });

    it('shoud render alternative block', async () => {
      const result = await useCase.execute({
        data: { steps: 5 },
        template,
      });

      expect(result).toEqual('<span>else block</span>');
    });
  });

  describe('gte helper', () => {
    const template = `{{#gte steps 5 }}<span>gte block</span>{{else}}<span>else block</span>{{/gte}}`;
    it('shoud render gte block', async () => {
      const result = await useCase.execute({
        data: { steps: 5 },
        template,
      });

      expect(result).toEqual('<span>gte block</span>');
    });

    it('shoud render alternative block', async () => {
      const result = await useCase.execute({
        data: { steps: 4 },
        template,
      });

      expect(result).toEqual('<span>else block</span>');
    });
  });

  describe('lt helper', () => {
    const template = `{{#lt steps 5 }}<span>lt block</span>{{else}}<span>else block</span>{{/lt}}`;
    it('shoud render lt block', async () => {
      const result = await useCase.execute({
        data: { steps: 4 },
        template,
      });

      expect(result).toEqual('<span>lt block</span>');
    });

    it('shoud render alternative block', async () => {
      const result = await useCase.execute({
        data: { steps: 5 },
        template,
      });

      expect(result).toEqual('<span>else block</span>');
    });
  });

  describe('lte helper', () => {
    const template = `{{#lte steps 5 }}<span>lte block</span>{{else}}<span>else block</span>{{/lte}}`;
    it('shoud render lte block', async () => {
      const result = await useCase.execute({
        data: { steps: 5 },
        template,
      });

      expect(result).toEqual('<span>lte block</span>');
    });

    it('shoud render alternative block', async () => {
      const result = await useCase.execute({
        data: { steps: 6 },
        template,
      });

      expect(result).toEqual('<span>else block</span>');
    });
  });

  describe('eq helper', () => {
    const template = `{{#eq steps 5 }}<span>eq block</span>{{else}}<span>else block</span>{{/eq}}`;
    it('shoud render eq block', async () => {
      const result = await useCase.execute({
        data: { steps: 5 },
        template,
      });

      expect(result).toEqual('<span>eq block</span>');
    });

    it('shoud use strict check and render alternative block', async () => {
      const result = await useCase.execute({
        data: { steps: '5' },
        template,
      });

      expect(result).toEqual('<span>else block</span>');
    });

    it('shoud render alternative block', async () => {
      const result = await useCase.execute({
        data: { steps: 6 },
        template,
      });

      expect(result).toEqual('<span>else block</span>');
    });
  });

  describe('ne helper', () => {
    const template = `{{#ne steps 5 }}<span>ne block</span>{{else}}<span>else block</span>{{/ne}}`;
    it('shoud render ne block', async () => {
      const result = await useCase.execute({
        data: { steps: 6 },
        template,
      });

      expect(result).toEqual('<span>ne block</span>');
    });

    it('shoud use strict check and render ne block', async () => {
      const result = await useCase.execute({
        data: { steps: '5' },
        template,
      });

      expect(result).toEqual('<span>ne block</span>');
    });

    it('shoud render alternative block', async () => {
      const result = await useCase.execute({
        data: { steps: 5 },
        template,
      });

      expect(result).toEqual('<span>else block</span>');
    });
  });
});
