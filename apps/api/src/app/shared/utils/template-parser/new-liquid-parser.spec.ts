import { JsonSchemaTypeEnum } from '@novu/dal';
import { expect } from 'chai';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { extractLiquidTemplateVariables } from './new-liquid-parser';

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
      const template = '{{payload.title}} {{test}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.title');
      expect(invalidVariables[0].name).to.equal('test');
    });

    it('should handle nested properties', () => {
      const template = '{{payload.title}} {{user.profile.address.street}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.title');
      expect(invalidVariables[0].name).to.equal('user.profile.address.street');
    });

    it('should handle array notation', () => {
      const template = '{{payload.items[0].name}} {{users[1].email}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.items[0].name');
      expect(invalidVariables[0].name).to.equal('users[1].email');
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
      const template = '{{payload.phone}} {{test}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template, variableSchema });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.phone');
      expect(invalidVariables[0].name).to.equal('test');
    });

    it('should handle nested properties', () => {
      const template = '{{payload.phone}} {{user.profile.address.street}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template, variableSchema });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.phone');
      expect(invalidVariables[0].name).to.equal('user.profile.address.street');
    });

    it('should handle array notation', () => {
      const template = '{{payload.items[1].email}} {{items[0].name}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template, variableSchema });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.items[1].email');
      expect(invalidVariables[0].name).to.equal('items[0].name');
    });

    it('should handle invalid payload variables', () => {
      const template = '{{payload.test}} {{items[0].name}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template, variableSchema });

      expect(validVariables).to.have.lengthOf(0);
      expect(invalidVariables).to.have.lengthOf(2);
      expect(invalidVariables[0].name).to.equal('payload.test');
      expect(invalidVariables[1].name).to.equal('items[0].name');
    });
  });

  describe('Variables with filters', () => {
    it('should handle variables with filters', () => {
      const template = '{{payload.name | upcase}} {{user.email | downcase}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.name');
      expect(invalidVariables[0].name).to.equal('user.email');
    });

    it('should handle toSentence filter with arguments', () => {
      const template = `{{ steps.digest-step.events | toSentence: 'payload.name', 2, 'other' }}`;
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(2);
      expect(invalidVariables).to.have.lengthOf(0);
      expect(validVariables[0].name).to.equal('steps.digest-step.events.payload.name');
      expect(validVariables[1].name).to.equal('steps.digest-step.events');
    });
  });

  describe('For loops', () => {
    it('should handle for loops with valid collection variable', () => {
      const template = '{% for item in payload.items %}{{item.name}}{{invalid}}{% endfor %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.items');
      expect(invalidVariables[0].name).to.equal('invalid');
    });

    it('should handle for loops with invalid collection variable', () => {
      const template = '{% for item in invalidCollection %}{{item.name}}{{payload.foo}}{% endfor %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.foo');
      expect(invalidVariables[0].name).to.equal('invalidCollection');
    });

    it('should handle for loops with ranges (literal)', () => {
      const template = '{% for i in (1..5) %}{{i}}{{payload.foo}}{% endfor %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.foo');
      expect(invalidVariables).to.have.lengthOf(0);
    });

    it('should handle for loops with ranges (variables)', () => {
      const template = '{% for i in (payload.start..payload.end) %}{{i}}{{payload.foo}}{{test}}{% endfor %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      expect(validVariables).to.have.lengthOf(3);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(variableNames).to.include('payload.start');
      expect(variableNames).to.include('payload.end');
      expect(variableNames).to.include('payload.foo');
      expect(invalidVariables[0].name).to.equal('test');
    });

    it('should handle nested for loops', () => {
      const template = `
        {% for user in payload.users %}
          {% for post in user.posts %}
            {{post.title}}
            {{invalid}}
          {% endfor %}
          {{invalid2}}
        {% endfor %}
      `;
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      const variableNames = validVariables.map((variable) => variable.name);
      const invalidVariableNames = invalidVariables.map((variable) => variable.name);
      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(2);
      expect(variableNames).to.include('payload.users');
      expect(invalidVariableNames).to.include('invalid');
      expect(invalidVariableNames).to.include('invalid2');
    });
  });

  describe('Conditional tags', () => {
    it('should handle if statements with valid condition', () => {
      const template = '{% if payload.isActive %}Welcome!{{invalid}}{% endif %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.isActive');
      expect(invalidVariables[0].name).to.equal('invalid');
    });

    it('should handle if statements with invalid condition', () => {
      const template = '{% if user.isActive %}Welcome!{{invalid}}{% endif %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });
      const invalidVariableNames = invalidVariables.map((variable) => variable.name);

      expect(validVariables).to.have.lengthOf(0);
      expect(invalidVariables).to.have.lengthOf(2);
      expect(invalidVariableNames).to.include('user.isActive');
      expect(invalidVariableNames).to.include('invalid');
    });

    it('should handle unless statements with valid condition', () => {
      const template = '{% unless payload.banned %}Show content{{invalid}}{% endunless %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.banned');
      expect(invalidVariables[0].name).to.equal('invalid');
    });

    it('should handle unless statements with invalid condition', () => {
      const template = '{% unless user.banned %}Show content{{invalid}}{% endunless %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });
      const invalidVariableNames = invalidVariables.map((variable) => variable.name);

      expect(validVariables).to.have.lengthOf(0);
      expect(invalidVariables).to.have.lengthOf(2);
      expect(invalidVariableNames).to.include('user.banned');
      expect(invalidVariableNames).to.include('invalid');
    });

    it('should handle complex conditions', () => {
      const template =
        '{% if user.age > 18 and payload.country == "US" %}Adult US user{{invalid}}{{payload.foo}}{% endif %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      const validVariableNames = validVariables.map((variable) => variable.name);
      const invalidVariableNames = invalidVariables.map((variable) => variable.name);

      expect(validVariables).to.have.lengthOf(2);
      expect(invalidVariables).to.have.lengthOf(2);
      expect(validVariableNames).to.include('payload.country');
      expect(validVariableNames).to.include('payload.foo');
      expect(invalidVariableNames).to.include('user.age');
      expect(invalidVariableNames).to.include('invalid');
    });

    it('should handle elsif branches', () => {
      const template = `
        {% if payload.role == "admin" %}
          Admin
        {% elsif user.role == "moderator" %}
          Mod
        {% else %}
          User
        {% endif %}
      `;
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.role');
      expect(invalidVariables[0].name).to.equal('user.role');
    });

    it('should handle multiple conditions', () => {
      const template = `
        {% if payload.title == "Awesome Shoes" and product.name == "hello" %}
          These shoes are awesome!
        {% endif %}
      `;
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.title');
      expect(invalidVariables[0].name).to.equal('product.name');
    });
  });

  describe('Assign tags', () => {
    it('should handle assign statements with valid variable', () => {
      const template = '{% assign fullName = payload.firstName %}{{fullName}}{{invalid}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.firstName');
      expect(invalidVariables[0].name).to.equal('invalid');
    });

    it('should handle assign statements with invalid variable', () => {
      const template = '{% assign fullName = user.firstName %}{{fullName}}{{payload.foo}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.foo');
      expect(invalidVariables[0].name).to.equal('user.firstName');
    });
  });

  describe('Capture tags', () => {
    it('should handle capture blocks', () => {
      const template = `
        {% capture greeting %}
          Hello {{payload.name}}!
        {% endcapture %}
        {{greeting}}
      `;
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(0);
      expect(validVariables[0].name).to.equal('payload.name');
    });
  });

  describe('Tablerow tags', () => {
    it('should handle tablerow loops', () => {
      const template =
        '{% tablerow product in payload.products %}{{product.name}}{{invalid}}{{payload.foo}}{% endtablerow %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });
      const validVariableNames = validVariables.map((variable) => variable.name);

      expect(validVariableNames).to.have.lengthOf(2);
      expect(validVariableNames).to.include('payload.products');
      expect(validVariableNames).to.include('payload.foo');
      expect(invalidVariables).to.have.lengthOf(1);
      expect(invalidVariables[0].name).to.equal('invalid');
    });

    it('should handle tablerow with ranges', () => {
      const template = '{% tablerow i in (1..payload.count) %}{{i}}{{invalid}}{{payload.foo}}{% endtablerow %}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      const validVariableNames = validVariables.map((variable) => variable.name);
      expect(validVariableNames).to.have.lengthOf(2);
      expect(validVariableNames).to.include('payload.count');
      expect(validVariableNames).to.include('payload.foo');
      expect(invalidVariables).to.have.lengthOf(1);
      expect(invalidVariables[0].name).to.equal('invalid');
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
        {% case payload.status %}
          {% when "active" %}
            Active user
          {% when "pending" %}
            Pending user
          {% else %}
            Unknown status
        {% endcase %}
      `;
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.status');
      expect(invalidVariables[0].name).to.equal('user.status');
    });

    it('should handle case with variable when conditions', () => {
      const template = `
        {% case payload.role %}
          {% when payload.adminRole %}
            Admin
          {% when settings.modRole %}
            Moderator
        {% endcase %}
      `;
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });
      const variableNames = validVariables.map((variable) => variable.name);

      expect(validVariables).to.have.lengthOf(2);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(variableNames).to.include('payload.role');
      expect(variableNames).to.include('payload.adminRole');
      expect(invalidVariables[0].name).to.equal('settings.modRole');
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
      const template = '{{payload.items[0].name}} {{user.items[0].name}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({
        template,
        variableSchema: commonSchema,
      });

      expect(validVariables).to.have.lengthOf(2);
      expect(invalidVariables).to.have.lengthOf(0);
      expect(validVariables[0].name).to.equal('payload.items[0].name');
      expect(validVariables[1].name).to.equal('user.items[0].name');
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
          {% if payload.premium %}
            <span class="premium">Premium User</span>
          {% endif %}
          <ul>
            {% for item in payload.items %}
              <li>{{item.title}}</li>
              <li>{{invalid}}</li>
            {% endfor %}
          </ul>
        </div>
      `;
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });
      const validVariableNames = validVariables.map((variable) => variable.name);
      const invalidVariableNames = invalidVariables.map((variable) => variable.name);

      expect(validVariables).to.have.lengthOf(2);
      expect(invalidVariables).to.have.lengthOf(3);
      expect(validVariableNames).to.include('payload.premium');
      expect(validVariableNames).to.include('payload.items');
      expect(invalidVariableNames).to.include('user.name');
      expect(invalidVariableNames).to.include('user.premium');
      expect(invalidVariableNames).to.include('invalid');
    });

    it('should deduplicate variables', () => {
      const template = '{{user.name}} {{user.name}} {{payload.name}} {{payload.name}}';
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });

      expect(validVariables).to.have.lengthOf(1);
      expect(validVariables[0].name).to.equal('payload.name');
      expect(invalidVariables).to.have.lengthOf(1);
      expect(invalidVariables[0].name).to.equal('user.name');
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should handle complex template', () => {
      const template = `
        {% assign firstName = payload.firstName %}
        {% assign customerName = customer.firstName %}
        <h1>Hello {{customerName}}!</h1>
        
        {% if payload.items.length > 0 %}
          <h2>Your Cart ({{payload.items.length}} items)</h2>
          {% for item in payload.items %}
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
      const validVariableNames = validVariables.map((variable) => variable.name);
      const invalidVariableNames = invalidVariables.map((variable) => variable.name);

      expect(validVariables).to.have.lengthOf(3);
      expect(invalidVariables).to.have.lengthOf(5);

      expect(validVariableNames).to.include('payload.firstName');
      expect(validVariableNames).to.include('payload.items.length');
      expect(validVariableNames).to.include('payload.items');
      expect(invalidVariableNames).to.include('customer.firstName');
      expect(invalidVariableNames).to.include('cart.subtotal');
      expect(invalidVariableNames).to.include('cart.discount');
      expect(invalidVariableNames).to.include('cart.total');
      expect(invalidVariableNames).to.include('customer.loyaltyTier');
    });

    it('should handle complex template with defined', () => {
      const template = `
        {% assign firstName = payload.firstName %}
        {% assign customerName = payload.invalid %}
        <h1>Hello {{customerName}}!</h1>
        
        {% if payload.items.length > 0 %}
          <h2>Your Cart ({{payload.items.length}} items)</h2>
          {% for item in payload.items %}
            <div>
              {{item.product.name}} - {{item.quantity}} x {{item.price}}
              {% if item.discountPercentage > 0 %}
                <span>{{item.discountPercentage}}% off!</span>
              {% endif %}
            </div>
          {% endfor %}
          
          <div>
            Subtotal: {{payload.subtotal}}
            {% if payload.discount > 0 %}
              Discount: -{{payload.discount}}
            {% endif %}
            Total: {{payload.total}}
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
      const variableSchema: JSONSchemaDto = {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: {
          payload: {
            type: JsonSchemaTypeEnum.OBJECT,
            properties: {
              firstName: { type: JsonSchemaTypeEnum.STRING },
              items: {
                type: JsonSchemaTypeEnum.ARRAY,
                properties: {
                  length: { type: JsonSchemaTypeEnum.NUMBER },
                },
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

      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({
        template,
        variableSchema,
      });
      const validVariableNames = validVariables.map((variable) => variable.name);
      const invalidVariableNames = invalidVariables.map((variable) => variable.name);

      expect(validVariables).to.have.lengthOf(3);
      expect(invalidVariables).to.have.lengthOf(5);

      expect(validVariableNames).to.include('payload.firstName');
      expect(validVariableNames).to.include('payload.items.length');
      expect(validVariableNames).to.include('payload.items');
      expect(invalidVariableNames).to.include('payload.invalid');
      expect(invalidVariableNames).to.include('payload.subtotal');
      expect(invalidVariableNames).to.include('payload.discount');
      expect(invalidVariableNames).to.include('payload.total');
      expect(invalidVariableNames).to.include('customer.loyaltyTier');
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

    it('should validate variables in the loops independently', () => {
      const template = `
        {% for item in payload.items %}
          <div>{{item.product.name}}</div>
        {% endfor %}

        {% for otherItem in payload.items2 %}
          <div>{{otherItem.product.name}}</div>
          <div>{{item.product.name}}</div>
        {% endfor %}
      `;

      const { validVariables, invalidVariables } = extractLiquidTemplateVariables({ template });
      const validVariableNames = validVariables.map((variable) => variable.name);
      const invalidVariableNames = invalidVariables.map((variable) => variable.name);

      expect(validVariables).to.have.lengthOf(2);
      expect(invalidVariables).to.have.lengthOf(1);
      expect(validVariableNames).to.include('payload.items');
      expect(validVariableNames).to.include('payload.items2');
      expect(invalidVariableNames).to.include('item.product.name');
    });
  });
});
