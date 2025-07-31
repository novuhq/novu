import { Liquid } from 'liquidjs';
import { describe, expect, it } from 'vitest';
import { createLiquidEngine, defaultOutputEscape, stringifyDataStructureWithSingleQuotes } from './liquid.utils';

describe('createLiquidEngine', () => {
  it('should create a Liquid instance with default configuration', () => {
    const engine = createLiquidEngine();
    expect(engine).toBeInstanceOf(Liquid);
  });

  it('should register the default json filter', async () => {
    const engine = createLiquidEngine();
    const template = '{{ data | json }}';
    const data = { data: { a: 1, b: 'test' } };
    const result = await engine.parseAndRender(template, data);
    expect(result).toBe("{'a':1,'b':'test'}");
  });

  it('should register the default digest filter', async () => {
    const engine = createLiquidEngine();
    const template = '{{ names | digest }}';
    const data = { names: ['John', 'Jane', 'Bob', 'Alice'] };
    const result = await engine.parseAndRender(template, data);
    expect(result).toBe('John, Jane and 2 others');
  });

  it('should register the toSentence filter', async () => {
    const engine = createLiquidEngine();
    const template = `{{ names | toSentence: '', 2, 'other' }}`;
    const data = { names: ['John', 'Jane', 'Bob', 'Alice'] };
    const result = await engine.parseAndRender(template, data);
    expect(result).toBe('John, Jane, and 2 others');
  });

  it('should register the pluralize filter', async () => {
    const engine = createLiquidEngine();
    const template = `{{ count | pluralize: 'other' }}`;
    const data = { count: 1 };
    const result = await engine.parseAndRender(template, data);
    expect(result).toBe('1 other');
  });

  it('should register the pluralize filter with showCount parameter', async () => {
    const engine = createLiquidEngine();
    const template = `{{ count | pluralize: 'activity', 'activities', false }}`;
    const data = { count: 2 };
    const result = await engine.parseAndRender(template, data);
    expect(result).toBe('activities');
  });

  it('should correctly handle complex templates with multiple filters', async () => {
    const engine = createLiquidEngine();

    let data = {
      users: [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
        { name: 'Bob', age: 40 },
      ],
    };
    const template = 'Users: {{ users | json }}\nFirst two users: {{ users | digest: 2, "name" }}';

    let result = await engine.parseAndRender(template, data);

    expect(result).toContain("Users: [{'name':'John','age':30},{'name':'Jane','age':25},{'name':'Bob','age':40}]");
    expect(result).toContain('First two users: John, Jane and 1 other');

    data = {
      users: [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
        { name: 'Bob', age: 40 },
        { name: 'Alice', age: 35 },
      ],
    };
    result = await engine.parseAndRender(template, data);

    expect(result).toContain(
      "Users: [{'name':'John','age':30},{'name':'Jane','age':25},{'name':'Bob','age':40},{'name':'Alice','age':35}]"
    );
    expect(result).toContain('First two users: John, Jane and 2 others');
  });

  it('should handle the compileControls pattern used in the framework', async () => {
    const engine = createLiquidEngine();

    // This test simulates how the template engine is used in Client.compileControls
    const templateControls = {
      subject: 'Hello, {{ subscriber.firstName }}',
      content: 'Your order #{{ payload.orderId }} has been {{ payload.status }}',
      buttonText: 'View details',
      amount: '{{ payload.amount }}',
      items: '{{ payload.items | json }}',
    };

    const event = {
      payload: {
        orderId: 'ORD-123',
        status: 'confirmed',
        amount: 99.99,
        items: [
          { name: 'Product A', quantity: 2 },
          { name: 'Product B', quantity: 1 },
        ],
      },
      subscriber: {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
      },
      state: [
        {
          stepId: 'previous-step',
          outputs: {
            result: 'success',
            metadata: { processed: true },
          },
        },
      ],
    };

    // Simulate the same approach as in the Client class
    const templateString = engine.parse(JSON.stringify(templateControls));

    const compiledString = await engine.render(templateString, {
      payload: event.payload,
      subscriber: event.subscriber,
      steps: event.state.reduce(
        (acc, state) => {
          acc[state.stepId] = state.outputs;

          return acc;
        },
        {} as Record<string, Record<string, unknown>>
      ),
    });

    const result = JSON.parse(compiledString);

    expect(result.subject).toBe('Hello, Alice');
    expect(result.content).toBe('Your order #ORD-123 has been confirmed');
    expect(result.amount).toBe('99.99');
    expect(result.items).toMatch(/^\[.*\]$/); // Just check if it's an array format
  });

  it('should properly parse and render complex control objects with nested properties', async () => {
    const engine = createLiquidEngine();

    const controls = {
      email: {
        subject: 'Welcome {{ subscriber.firstName }}',
        header: '{{ payload.companyName }} Newsletter',
        body: {
          greeting: 'Hi {{ subscriber.firstName }} {{ subscriber.lastName }}',
          content: 'Thanks for signing up for our {{ payload.subscriptionType }} plan',
          footer: 'Contact us at {{ payload.contact.email }}',
        },
        attachments: '{{ payload.files | json }}',
      },
      timing: {
        sendAt: '{{ payload.scheduledTime }}',
        expireAt: '{{ payload.expiryTime }}',
      },
    };

    const data = {
      payload: {
        companyName: 'Acme Inc',
        subscriptionType: 'premium',
        scheduledTime: '2023-05-10T15:00:00Z',
        expiryTime: '2023-06-10T15:00:00Z',
        contact: {
          email: 'support@acme.com',
          phone: '+1234567890',
        },
        files: [
          { name: 'welcome.pdf', url: 'https://example.com/welcome.pdf' },
          { name: 'terms.pdf', url: 'https://example.com/terms.pdf' },
        ],
      },
      subscriber: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    };

    const templateString = engine.parse(JSON.stringify(controls));
    const rendered = await engine.render(templateString, data);
    const result = JSON.parse(rendered);

    expect(result.email.subject).toBe('Welcome John');
    expect(result.email.header).toBe('Acme Inc Newsletter');
    expect(result.email.body.greeting).toBe('Hi John Doe');
    expect(result.email.body.content).toBe('Thanks for signing up for our premium plan');
    expect(result.email.body.footer).toBe('Contact us at support@acme.com');
    expect(result.email.attachments).toMatch(/^\[.*\]$/); // Just check if it's an array format
    expect(result.timing.sendAt).toBe('2023-05-10T15:00:00Z');
    expect(result.timing.expireAt).toBe('2023-06-10T15:00:00Z');
  });

  it('should handle step outputs reference in templates', async () => {
    const engine = createLiquidEngine();

    const template =
      'Previous step result: {{ steps.step1.status }}\nDigest result: {{ steps.digest.users | digest }}\nFrom email step: {{ steps.email.recipient }}';

    const data = {
      steps: {
        step1: {
          status: 'success',
          timestamp: '2023-01-01T12:00:00Z',
        },
        digest: {
          users: ['Alice', 'Bob', 'Charlie', 'David'],
        },
        email: {
          recipient: 'user@example.com',
          subject: 'Important notification',
        },
      },
    };

    const result = await engine.parseAndRender(template, data);

    expect(result).toContain('Previous step result: success');
    expect(result).toContain('Digest result: Alice, Bob and 2 others');
    expect(result).toContain('From email step: user@example.com');
  });

  it('should handle displaying array items directly', async () => {
    const engine = createLiquidEngine();

    // Using a simplified template without loops
    const template = 'Items: {{ payload.items | json }}\nTotal: ${{ payload.total }}';

    const data = {
      payload: {
        items: [
          { name: 'Item 1', price: 10 },
          { name: 'Item 2', price: 20 },
          { name: 'Item 3', price: 30 },
        ],
        total: 60,
      },
    };

    const result = await engine.parseAndRender(template, data);
    expect(result).toContain('Items:');
    expect(result).toContain('Total: $60');
  });

  it('should preserve newlines in data payload when rendering templates', async () => {
    const engine = createLiquidEngine();

    // Template with multiline content
    const template = `
      Message:\n{{ payload.message }}
      
      Formatted description:
      {{ payload.formattedDescription }}
    `;

    const data = {
      payload: {
        message: 'Line 1\nLine 2\nLine 3',
        formattedDescription: 'Header\n\n- Point 1\n- Point 2\n\nFooter',
      },
    };

    const result = await engine.parseAndRender(template, data);

    // Verify newlines are escaped in the output as expected by the engine's behavior
    expect(result).toContain('Message:\nLine 1\\nLine 2\\nLine 3');
    expect(result).toContain('Formatted description:\n      Header\\n\\n- Point 1\\n- Point 2\\n\\nFooter');

    // Also test with json filter to ensure object serialization preserves newlines
    const jsonTemplate = '{{ payload.message | json }}';
    const jsonResult = await engine.parseAndRender(jsonTemplate, data);
    expect(jsonResult).toBe('Line 1\\nLine 2\\nLine 3');
  });
});

describe('defaultOutputEscape', () => {
  it('should convert arrays to strings with single quotes', () => {
    // prettier-ignore
    const array = ['a', 'b', 'c'];

    const result = defaultOutputEscape(array);
    expect(result).toBe("['a','b','c']");
  });

  it('should convert objects to strings with single quotes', () => {
    // prettier-ignore
    const obj = { a: 1, b: 'test' };
    const result = defaultOutputEscape(obj);
    expect(result).toBe("{'a':1,'b':'test'}");
  });

  it('should handle nested objects and arrays', () => {
    // prettier-ignore
    const complex = { a: [1, 2], b: { c: 'test' } };
    const result = defaultOutputEscape(complex);
    expect(result).toBe("{'a':[1,2],'b':{'c':'test'}}");
  });

  it('should escape newlines in strings', () => {
    const str = 'line1\nline2';
    const result = defaultOutputEscape(str);
    expect(result).toBe('line1\\nline2');
  });

  it('should convert primitives to strings', () => {
    expect(defaultOutputEscape(123)).toBe('123');
    expect(defaultOutputEscape(true)).toBe('true');
    expect(defaultOutputEscape(false)).toBe('false');
    expect(defaultOutputEscape(null)).toBe('');
    expect(defaultOutputEscape(undefined)).toBe('');
  });
});

describe('stringifyDataStructureWithSingleQuotes', () => {
  it('should convert a simple array to a string with single quotes', () => {
    const myTestArray = ['a', 'b', 'c'];
    const converted = stringifyDataStructureWithSingleQuotes(myTestArray);
    expect(converted).toStrictEqual("['a','b','c']");
  });

  it('should convert an array with nested objects to a string with single quotes', () => {
    const myTestObject = [{ text: 'cat' }, { text: 'dog' }];
    const converted = stringifyDataStructureWithSingleQuotes(myTestObject);
    expect(converted).toStrictEqual("[{'text':'cat'},{'text':'dog'}]");
  });

  it('should convert an object with nested objects to a string with single quotes', () => {
    const myTestObject = { comments: [{ text: 'cat' }, { text: 'dog' }] };
    const converted = stringifyDataStructureWithSingleQuotes(myTestObject);
    expect(converted).toStrictEqual("{'comments':[{'text':'cat'},{'text':'dog'}]}");
  });

  it('should convert an object with nested objects to a string with single quotes and spaces', () => {
    const myTestObject = { comments: [{ text: 'cat' }, { text: 'dog' }] };
    const converted = stringifyDataStructureWithSingleQuotes(myTestObject, 2);
    expect(converted).toStrictEqual(
      `{\\n  'comments': [\\n    {\\n      'text': 'cat'\\n    },\\n    {\\n      'text': 'dog'\\n    }\\n  ]\\n}`
    );
  });

  it('should convert a string to a string without single quotes', () => {
    const myTestString = 'hello';
    const converted = stringifyDataStructureWithSingleQuotes(myTestString);
    expect(converted).toStrictEqual('hello');
  });

  it('should convert a number to a string without single quotes', () => {
    const myTestNumber = 123;
    const converted = stringifyDataStructureWithSingleQuotes(myTestNumber);
    expect(converted).toStrictEqual('123');
  });

  it('should convert a boolean to a string without single quotes', () => {
    const myTestBoolean = true;
    const converted = stringifyDataStructureWithSingleQuotes(myTestBoolean);
    expect(converted).toStrictEqual('true');
  });

  it('should convert null to an empty string', () => {
    const myTestNull = null;
    const converted = stringifyDataStructureWithSingleQuotes(myTestNull);
    expect(converted).toStrictEqual('');
  });

  it('should convert undefined to an empty string', () => {
    const myTestUndefined = undefined;
    const converted = stringifyDataStructureWithSingleQuotes(myTestUndefined);
    expect(converted).toStrictEqual('');
  });
});
