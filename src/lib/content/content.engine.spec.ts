import { compileTemplate, getHandlebarsVariables } from './content.engine';

test('should parse basic variables correctly', () => {
  const html = compileTemplate(
    `
    Basic Html <div> {{firstName}} </div>
  `,
    {
      firstName: 'test variable',
    }
  );
  expect(html).toContain('<div> test variable </div>');
});

test('should parse loop iterations', () => {
  const html = compileTemplate(
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
  const html = compileTemplate(
    `
    Basic Html <div> {{#if flag}} Content to display {{/if}} </div>
  `,
    {
      flag: true,
    }
  );
  expect(html).toContain('Content to display');

  const htmlWithoutContent = compileTemplate(
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
  const variables = getHandlebarsVariables(`
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
