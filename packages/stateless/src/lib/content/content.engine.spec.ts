import { HandlebarsContentEngine } from './content.engine';

test('should parse basic variables correctly', () => {
  const engine = new HandlebarsContentEngine();
  const html = engine.compileTemplate(
    `
    Basic Html <div> {{firstName}} {{user.lastName}} </div>
  `,
    {
      firstName: 'test variable',
      user: {
        lastName: 'test nested',
      },
    }
  );

  expect(html).toContain('<div> test variable test nested </div>');
});

test('should parse loop iterations', () => {
  const engine = new HandlebarsContentEngine();
  const html = engine.compileTemplate(
    `
    Basic Html <div> {{#each items}} {{this}} {{/each}} </div>
  `,
    {
      items: ['first item', 'second item'],
    }
  );

  expect(html).toContain('first item');
  expect(html).toContain('second item');
});

test('should parse if statements', () => {
  const engine = new HandlebarsContentEngine();
  const html = engine.compileTemplate(
    `
    Basic Html <div> {{#if flag}} Content to display {{/if}} </div>
  `,
    {
      flag: true,
    }
  );

  expect(html).toContain('Content to display');

  const htmlWithoutContent = engine.compileTemplate(
    `
    Basic Html <div> {{#if flag}} Content to display {{/if}} </div>
  `,
    {
      flag: false,
    }
  );

  expect(htmlWithoutContent).not.toContain('second item');
});

test('should extract template variables', () => {
  const engine = new HandlebarsContentEngine();
  const variables = engine.extractMessageVariables(`
    {{firstName}}
    <div> {{#if name}} {{/if}} {{cats}} </div>

    {{user.name}}

    {{#each items}}
      {{cellular}}
    {{/each}}
  `);

  expect(variables.length).toEqual(3);
  expect(variables).toContain('firstName');
  expect(variables).toContain('user.name');
  expect(variables).toContain('cats');
});
