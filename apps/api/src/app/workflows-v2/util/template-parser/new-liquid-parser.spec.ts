import { expect } from 'chai';
import { JsonSchemaTypeEnum } from '@novu/dal';
import { extractLiquidTemplateVariables } from './new-liquid-parser';
import { JSONSchemaDto } from '../../dtos';

describe('extractLiquidTemplateVariables', () => {
  // Define a common schema that can be used across multiple describe blocks
  const commonSchema: JSONSchemaDto = {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: {
      user: {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: {
          name: { type: JsonSchemaTypeEnum.STRING },
          email: { type: JsonSchemaTypeEnum.STRING },
        },
      },
      payload: {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: {
          items: {
            type: JsonSchemaTypeEnum.ARRAY,
            items: {
              type: JsonSchemaTypeEnum.OBJECT,
              properties: {
                name: { type: JsonSchemaTypeEnum.STRING },
              },
            },
          },
        },
      },
    },
  };

  describe('Basic output variables without schema', () => {
    it('should extract simple variables', () => {
      const template = '{{user.name}} {{user.email}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(2);
      expect(invalidVariables).to.have.lengthOf(0);
      expect(validVariables[0].name).to.equal('user.name');
      expect(validVariables[1].name).to.equal('user.email');
    });

    it('should handle nested properties', () => {
      const template = '{{user.profile.address.street}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(0);
      expect(validVariables[0].name).to.equal('user.profile.address.street');
    });

    it('should handle array notation', () => {
      const template = '{{items[0].name}} {{users[1].email}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(2);
      expect(invalidVariables).to.have.lengthOf(0);
      expect(validVariables[0].name).to.equal('items[0].name');
      expect(validVariables[1].name).to.equal('users[1].email');
    });

    it('should reject variables without namespace', () => {
      const template = '{{firstName}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(0);
      expect(validVariables[0].name).to.equal('firstName');
    });
  });

  describe('Basic output variables with schema', () => {
    const variableSchema: JSONSchemaDto = {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: {
        payload: {
          type: JsonSchemaTypeEnum.OBJECT,
          properties: {
            phone: { type: JsonSchemaTypeEnum.STRING },
            job: {
              type: JsonSchemaTypeEnum.OBJECT,
              properties: {
                title: { type: JsonSchemaTypeEnum.STRING },
              },
            },
            items: {
              type: JsonSchemaTypeEnum.ARRAY,
              items: {
                type: JsonSchemaTypeEnum.OBJECT,
                properties: {
                  email: { type: JsonSchemaTypeEnum.STRING },
                },
              },
            },
          },
        },
      },
    };

    it('should extract simple variables', () => {
      const template = '{{payload.phone}} {{user.name}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template, variableSchema });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.phone');
      expect(invalidVariables[0].name).to.equal('user.name');
    });

    it('should handle nested properties', () => {
      const template = '{{payload.job.title}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template, variableSchema });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(0);
      expect(validVariables[0].name).to.equal('payload.job.title');
    });

    it('should handle array notation', () => {
      const template = '{{payload.items[1].email}} {{items[0].name}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template, variableSchema });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.items[1].email');
      expect(invalidVariables[0].name).to.equal('items[0].name');
    });

    it('should reject variables without namespace', () => {
      const template = '{{firstName}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template, variableSchema });

      expect(validVariables).to.have.lengthOf(0);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(invalidVariables[0].name).to.equal('firstName');
      expect(invalidVariables[0].message).to.include('missing namespace');
    });
  });

  describe('Variables with filters', () => {
    it('should handle variables with filters', () => {
      const template = '{{user.name | upcase}} {{user.email | downcase}}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(2);
      expect(validVariables[0].name).to.equal('user.name');
      expect(validVariables[1].name).to.equal('user.email');
    });

    it('should handle toSentence filter with arguments', () => {
      const template = `{{ steps.digest-step.events | toSentence: 'payload.name', 2, 'other' }}`;
      const { validVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(2);
      expect(validVariables[0].name).to.equal('steps.digest-step.events');
      expect(validVariables[1].name).to.equal('steps.digest-step.events.payload.name');
    });
  });

  describe('For loops', () => {
    it('should handle for loops with collections', () => {
      const template = '{% for item in payload.items %}{{item.name}}{% endfor %}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('item'); // Iterator is always valid
      expect(variableNames).to.include('payload.items'); // Collection
      expect(variableNames).to.include('item.name'); // Variable inside loop
    });

    it('should handle for loops with ranges (literal)', () => {
      const template = '{% for i in (1..5) %}{{i}}{% endfor %}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('i'); // Iterator
    });

    it('should handle for loops with ranges (variables)', () => {
      const template = '{% for i in (start..end) %}{{i}}{% endfor %}';
      const schema: JSONSchemaDto = {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: {
          start: { type: JsonSchemaTypeEnum.NUMBER },
          end: { type: JsonSchemaTypeEnum.NUMBER },
        },
      };
      const { validVariables } = extractLiquidTemplateVariables({ template, variableSchema: schema });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('i');
      expect(variableNames).to.include('start');
      expect(variableNames).to.include('end');
    });

    it('should handle nested for loops', () => {
      const template = `
        {% for user in payload.users %}
          {% for post in user.posts %}
            {{post.title}}
          {% endfor %}
        {% endfor %}
      `;
      const { validVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('user');
      expect(variableNames).to.include('payload.users');
      expect(variableNames).to.include('post');
      expect(variableNames).to.include('user.posts');
      expect(variableNames).to.include('post.title');
    });
  });

  describe('Conditional tags', () => {
    it('should handle if statements', () => {
      const template = '{% if user.isActive %}Welcome!{% endif %}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('user.isActive');
    });

    it('should handle unless statements', () => {
      const template = '{% unless user.banned %}Show content{% endunless %}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('user.banned');
    });

    it('should handle complex conditions', () => {
      const template = '{% if user.age > 18 and user.country == "US" %}Adult US user{% endif %}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('user.age');
      expect(variableNames).to.include('user.country');
    });

    it('should handle elsif branches', () => {
      const template = `
        {% if user.role == "admin" %}
          Admin
        {% elsif user.role == "moderator" %}
          Mod
        {% else %}
          User
        {% endif %}
      `;
      const { validVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('user.role');
    });

    it('should handle multiple conditions', () => {
      const template = `
        {% if product.title == "Awesome Shoes" and product.name == "hello" %}
          These shoes are awesome!
        {% endif %}
      `;
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(2);
      expect(invalidVariables).to.have.lengthOf(0);
      expect(validVariables[0].name).to.equal('product.title');
      expect(validVariables[1].name).to.equal('product.name');
    });
  });

  describe('Assign tags', () => {
    it('should handle assign statements', () => {
      const template = '{% assign fullName = user.firstName %}{{fullName}}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('fullName'); // Assigned variable (always valid)
      expect(variableNames).to.include('user.firstName'); // Source variable
    });

    it('should handle assign with expressions', () => {
      const template = '{% assign total = cart.subtotal %}{{total}}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('total');
      expect(variableNames).to.include('cart.subtotal');
    });
  });

  describe('Capture tags', () => {
    it('should handle capture blocks', () => {
      const template = `
        {% capture greeting %}
          Hello {{user.name}}!
        {% endcapture %}
        {{greeting}}
      `;
      const { validVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('greeting'); // Captured variable (always valid)
      expect(variableNames).to.include('user.name'); // Variable inside capture
    });
  });

  describe('Tablerow tags', () => {
    it('should handle tablerow loops', () => {
      const template = '{% tablerow product in payload.products %}{{product.name}}{% endtablerow %}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('product'); // Iterator
      expect(variableNames).to.include('payload.products'); // Collection
      expect(variableNames).to.include('product.name'); // Variable inside loop
    });

    it('should handle tablerow with ranges', () => {
      const template = '{% tablerow i in (1..count) %}{{i}}{% endtablerow %}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('i');
      expect(variableNames).to.include('count');
    });
  });

  describe('Case/when tags', () => {
    it('should handle case statements', () => {
      const template = `
        {% case user.status %}
          {% when "active" %}
            Active user
          {% when "pending" %}
            Pending user
          {% else %}
            Unknown status
        {% endcase %}
      `;
      const { validVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('user.status');
    });

    it('should handle case with variable when conditions', () => {
      const template = `
        {% case user.role %}
          {% when settings.adminRole %}
            Admin
          {% when settings.modRole %}
            Moderator
        {% endcase %}
      `;
      const { validVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('user.role');
      expect(variableNames).to.include('settings.adminRole');
      expect(variableNames).to.include('settings.modRole');
    });
  });

  describe('Schema validation', () => {
    it('should validate variables against schema', () => {
      const template = '{{user.name}} {{user.invalidField}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({
        template,
        variableSchema: commonSchema,
      });

      expect(validVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('user.name');
      expect(invalidVariables).to.have.lengthOf(1);
      expect(invalidVariables[0].name).to.equal('user.invalidField');
      expect(invalidVariables[0].message).to.equal('is not supported');
    });

    it('should validate array access', () => {
      const template = '{{payload.items[0].name}}';
      const { validVariables } = extractLiquidTemplateVariables({
        template,
        variableSchema: commonSchema,
      });

      expect(validVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.items[0].name');
    });
  });

  describe('Local variable scoping', () => {
    it('should not validate local variables from for loops against schema', () => {
      const template = `
        {% for item in payload.items %}
          {{item.anyProperty}}
        {% endfor %}
      `;
      const { validVariables } = extractLiquidTemplateVariables({
        template,
        variableSchema: commonSchema, // Use the common schema
      });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('item'); // Iterator
      expect(variableNames).to.include('item.anyProperty'); // Should be valid (local variable)
    });

    it('should track local variables across nested scopes', () => {
      const template = `
        {% assign localVar = "test" %}
        {% for item in payload.items %}
          {{localVar}}
          {{item.name}}
        {% endfor %}
      `;
      const { validVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(4);
      expect(validVariables[0].name).to.equal('localVar');
      expect(validVariables[1].name).to.equal('item');
      expect(validVariables[2].name).to.equal('payload.items');
      expect(validVariables[3].name).to.equal('item.name');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty template', () => {
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template: '' });

      expect(validVariables).to.have.lengthOf(0);
      expect(invalidVariables).to.have.lengthOf(0);
    });

    it('should handle template with only text', () => {
      const template = 'Hello world, no variables here!';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(0);
      expect(invalidVariables).to.have.lengthOf(0);
    });

    it('should handle invalid liquid syntax', () => {
      const template = '{{user..name}} {{invalid syntax}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(0);
      expect(invalidVariables.length).to.be.greaterThan(0);
    });

    it('should handle mixed HTML and Liquid', () => {
      const template = `
        <div>
          <h1>{{user.name}}</h1>
          {% if user.premium %}
            <span class="premium">Premium User</span>
          {% endif %}
          <ul>
            {% for item in payload.items %}
              <li>{{item.title}}</li>
            {% endfor %}
          </ul>
        </div>
      `;
      const { validVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(variableNames).to.include('user.name');
      expect(variableNames).to.include('user.premium');
      expect(variableNames).to.include('payload.items');
      expect(variableNames).to.include('item');
      expect(variableNames).to.include('item.title');
    });

    it('should deduplicate variables', () => {
      const template = '{{user.name}} {{user.name}} {{user.name}}';
      const { validVariables } = extractLiquidTemplateVariables({ template });

      // With the updated code, we actually get 3 occurrences now
      const uniqueNames = [...new Set(validVariables.map((variable) => variable.name))];
      expect(uniqueNames).to.have.lengthOf(1);
      expect(uniqueNames[0]).to.equal('user.name');
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should handle complex template', () => {
      const template = `
        {% assign customerName = customer.firstName %}
        <h1>Hello {{customerName}}!</h1>
        
        {% if cart.items.size > 0 %}
          <h2>Your Cart ({{cart.items.size}} items)</h2>
          {% for item in cart.items %}
            <div>
              {{item.product.name}} - {{item.quantity}} x {{item.price}}
              {% if item.discountPercentage > 0 %}
                <span>{{item.discountPercentage}}% off!</span>
              {% endif %}
            </div>
          {% endfor %}
          
          <div>
            Subtotal: {{cart.subtotal}}
            {% if cart.discount > 0 %}
              Discount: -{{cart.discount}}
            {% endif %}
            Total: {{cart.total}}
          </div>
        {% else %}
          <p>Your cart is empty</p>
        {% endif %}
        
        {% case customer.loyaltyTier %}
          {% when "gold" %}
            <p>Gold member benefits apply!</p>
          {% when "silver" %}
            <p>Silver member benefits apply!</p>
        {% endcase %}
      `;

      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(invalidVariables).to.have.lengthOf(0);

      const variableNames = validVariables.map((variable) => variable.name);

      // Assigned variables
      expect(variableNames).to.include('customerName');

      // Customer variables
      expect(variableNames).to.include('customer.firstName');
      expect(variableNames).to.include('customer.loyaltyTier');

      // Cart variables
      expect(variableNames).to.include('cart.items.size');
      expect(variableNames).to.include('cart.items');
      expect(variableNames).to.include('cart.subtotal');
      expect(variableNames).to.include('cart.discount');
      expect(variableNames).to.include('cart.total');

      // Loop variables
      expect(variableNames).to.include('item');
      expect(variableNames).to.include('item.product.name');
      expect(variableNames).to.include('item.quantity');
      expect(variableNames).to.include('item.price');
      expect(variableNames).to.include('item.discountPercentage');
    });

    it('should handle undefined filters as invalid', () => {
      const template = '{{item.price | currency}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(0);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(invalidVariables[0].name).to.equal('item.price');
      expect(invalidVariables[0].message).to.exist;
      expect(invalidVariables[0].message).to.include('undefined filter: currency');
    });
  });
});
