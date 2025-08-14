import { JSONSchemaFaker } from 'json-schema-faker';
import _ from 'lodash';

/**
 * JSON Schema Mock Generator
 *
 * This utility provides intelligent mock data generation for JSON schemas,
 * with comprehensive heuristics for property name detection and realistic examples.
 */
export class JsonSchemaMock {
  private static isConfigured = false;

  /**
   * Configure JSON Schema Faker with optimal settings for human-readable mock data
   */
  static configure(): void {
    if (JsonSchemaMock.isConfigured) return;

    // Configure JSON Schema Faker for better mock data generation
    JSONSchemaFaker.option({
      useDefaultValue: true,
      alwaysFakeOptionals: true,
      fillProperties: false, // Don't fill properties not defined in schema
      optionalsProbability: 1.0,
      minItems: 1,
      maxItems: 3,
      minLength: 3,
      maxLength: 50,
      useExamplesValue: true,
      ignoreMissingRefs: true,
      failOnInvalidFormat: false, // Don't fail on unknown formats
      defaultRandExpMax: 10, // Limit regex complexity
    });

    // Add custom formats for more realistic data
    JSONSchemaFaker.format('email', () => 'user@example.com');
    JSONSchemaFaker.format('uri', () => 'https://example.com');
    JSONSchemaFaker.format('url', () => 'https://example.com');
    JSONSchemaFaker.format('date-time', () => new Date().toISOString());
    JSONSchemaFaker.format('date', () => new Date().toISOString().split('T')[0]);
    JSONSchemaFaker.format('time', () => new Date().toTimeString().split(' ')[0]);

    JsonSchemaMock.isConfigured = true;
  }

  /**
   * Generate mock data from a JSON schema with intelligent property detection
   */
  static generate(schema: unknown): unknown {
    JsonSchemaMock.configure();

    const enhancedSchema = JsonSchemaMock.addExamplesToSchema(schema);

    return JSONSchemaFaker.generate(enhancedSchema);
  }

  /**
   * Get example value for string property based on intelligent heuristics
   */
  private static getExampleValueForStringProperty(key: string, prop: Record<string, unknown>): string {
    const lowerKey = key.toLowerCase();

    // Check explicit format first
    if (prop.format === 'email') return 'user@example.com';
    if (prop.format === 'uri' || prop.format === 'url') return 'https://example.com';
    if (prop.format === 'date-time') return new Date().toISOString();
    if (prop.format === 'date') return new Date().toISOString().split('T')[0];
    if (prop.format === 'time') return new Date().toTimeString().split(' ')[0];
    if (prop.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';

    // Email patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['email', 'mail', 'e_mail', 'emailaddress', 'email_address'])) {
      return 'user@example.com';
    }

    // URL/Link patterns
    if (
      JsonSchemaMock.matchesPattern(lowerKey, [
        'url',
        'uri',
        'link',
        'href',
        'website',
        'homepage',
        'site',
        'web',
        'domain',
      ])
    ) {
      return 'https://example.com';
    }

    // Name patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['firstname', 'first_name', 'fname', 'givenname', 'given_name'])) {
      return 'John';
    }
    if (
      JsonSchemaMock.matchesPattern(lowerKey, [
        'lastname',
        'last_name',
        'lname',
        'surname',
        'familyname',
        'family_name',
      ])
    ) {
      return 'Doe';
    }
    if (
      JsonSchemaMock.matchesPattern(lowerKey, [
        'fullname',
        'full_name',
        'name',
        'displayname',
        'display_name',
        'username',
        'user_name',
      ])
    ) {
      return 'John Doe';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['jobtitle', 'job_title', 'position', 'role'])) {
      return 'Software Engineer';
    }

    // Address patterns
    if (
      JsonSchemaMock.matchesPattern(lowerKey, [
        'address',
        'street',
        'streetaddress',
        'street_address',
        'address1',
        'address_1',
      ])
    ) {
      return '123 Main Street';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['address2', 'address_2', 'apartment', 'apt', 'suite', 'unit'])) {
      return 'Apt 4B';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['city', 'town', 'locality'])) {
      return 'New York';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['state', 'province', 'region', 'county'])) {
      return 'NY';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['country', 'nation'])) {
      return 'United States';
    }
    if (
      JsonSchemaMock.matchesPattern(lowerKey, ['zipcode', 'zip_code', 'zip', 'postalcode', 'postal_code', 'postcode'])
    ) {
      return '10001';
    }

    // Phone patterns
    if (
      JsonSchemaMock.matchesPattern(lowerKey, [
        'phone',
        'telephone',
        'tel',
        'mobile',
        'cell',
        'phonenumber',
        'phone_number',
      ])
    ) {
      return '+1-555-123-4567';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['fax', 'faxnumber', 'fax_number'])) {
      return '+1-555-123-4568';
    }

    // Company/Organization patterns
    if (
      JsonSchemaMock.matchesPattern(lowerKey, [
        'company',
        'organization',
        'org',
        'business',
        'employer',
        'companyname',
        'company_name',
      ])
    ) {
      return 'Example Corp';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['department', 'dept', 'division', 'team'])) {
      return 'Engineering';
    }

    // ID patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['id', 'identifier', 'uuid', 'guid', 'key'])) {
      // Generate a more unique ID for digest events
      const timestamp = Date.now().toString().slice(-6);

      return `example-id-${timestamp}`;
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['userid', 'user_id', 'customerid', 'customer_id'])) {
      return 'user_12345';
    }

    // Description/Content patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['description', 'desc', 'summary', 'bio', 'biography', 'about'])) {
      return 'This is an example description with some sample content.';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['message', 'msg', 'text', 'content', 'body', 'note', 'comment'])) {
      return 'This is an example message.';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['subject', 'topic', 'headline', 'header'])) {
      return 'Example Subject';
    }

    // Date/Time patterns (when not using format)
    if (JsonSchemaMock.matchesPattern(lowerKey, ['date', 'created', 'updated', 'modified', 'timestamp'])) {
      return new Date().toISOString().split('T')[0];
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['time', 'hour', 'minute'])) {
      // For digest events, return full ISO date string instead of just time
      if (lowerKey === 'time') {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() - 1);
        eventDate.setHours(12, 0, 0, 0);

        return eventDate.toISOString();
      }

      return new Date().toTimeString().split(' ')[0];
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['datetime', 'createdat', 'created_at', 'updatedat', 'updated_at'])) {
      return new Date().toISOString();
    }

    // Color patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['color', 'colour', 'hex', 'rgb'])) {
      return '#3B82F6';
    }

    // Money patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['money', 'price', 'cost', 'amount', 'value', 'fee'])) {
      return '99.99';
    }

    // Currency
    if (JsonSchemaMock.matchesPattern(lowerKey, ['currency'])) {
      return '$';
    }

    // Status/State patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['status', 'state', 'stage', 'phase'])) {
      return 'active';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['type', 'kind', 'category', 'class'])) {
      return 'standard';
    }

    // Language/Locale patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['language', 'lang', 'locale', 'timezone', 'tz'])) {
      return 'en_US';
    }

    // Version patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['version', 'ver', 'revision', 'build'])) {
      return '1.0.0';
    }

    // Social media patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['twitter', 'facebook', 'linkedin', 'instagram', 'github'])) {
      return '@example';
    }

    // File patterns
    if (JsonSchemaMock.matchesPattern(lowerKey, ['filename', 'file_name', 'filepath', 'file_path', 'path'])) {
      return 'example-file.txt';
    }
    if (JsonSchemaMock.matchesPattern(lowerKey, ['extension', 'ext', 'mimetype', 'mime_type'])) {
      return 'txt';
    }

    // Default fallback
    return 'example text';
  }

  /**
   * Check if a key matches any of the given patterns
   */
  private static matchesPattern(key: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      // Exact match
      if (key === pattern) return true;
      // Contains pattern
      if (key.includes(pattern)) return true;
      // Starts with pattern
      if (key.startsWith(pattern)) return true;
      // Ends with pattern
      if (key.endsWith(pattern)) return true;

      return false;
    });
  }

  /**
   * Add intelligent examples to schema properties based on their names and types
   */
  private static addExamplesToSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const enhancedSchema = _.cloneDeep(schema);

    // Recursively add examples to properties
    if (enhancedSchema.properties && typeof enhancedSchema.properties === 'object') {
      for (const [key, propertySchema] of Object.entries(enhancedSchema.properties)) {
        if (propertySchema && typeof propertySchema === 'object') {
          const prop = propertySchema as any;

          // Handle enum values first - use the first enum value
          if (prop.enum && Array.isArray(prop.enum) && prop.enum.length > 0 && !prop.examples && !prop.example) {
            prop.examples = [prop.enum[0]];
            continue; // Skip other processing for enum properties
          }

          // Add examples for string properties to override lorem ipsum
          if (prop.type === 'string' && !prop.examples && !prop.example && !prop.default) {
            prop.examples = [JsonSchemaMock.getExampleValueForStringProperty(key, prop)];
          }

          // Add examples for number properties to override large random numbers
          if ((prop.type === 'number' || prop.type === 'integer') && !prop.examples && !prop.example && !prop.default) {
            // Use schema constraints if available
            if (prop.minimum !== undefined && prop.maximum !== undefined) {
              const midpoint = Math.floor((prop.minimum + prop.maximum) / 2);
              prop.examples = [midpoint];
            } else if (prop.minimum !== undefined) {
              prop.examples = [Math.max(prop.minimum, 42)];
            } else if (prop.maximum !== undefined) {
              prop.examples = [Math.min(prop.maximum, 42)];
            } else {
              // Smart defaults based on property name
              const lowerKey = key.toLowerCase();
              if (JsonSchemaMock.matchesPattern(lowerKey, ['age', 'years', 'year'])) {
                prop.examples = [25];
              } else if (JsonSchemaMock.matchesPattern(lowerKey, ['count', 'quantity', 'qty', 'number', 'num'])) {
                prop.examples = [5];
              } else if (
                JsonSchemaMock.matchesPattern(lowerKey, ['price', 'cost', 'amount', 'value', 'fee', 'salary'])
              ) {
                prop.examples = [prop.type === 'integer' ? 99 : 99.99];
              } else if (JsonSchemaMock.matchesPattern(lowerKey, ['percent', 'percentage', 'rate', 'ratio'])) {
                prop.examples = [15];
              } else if (JsonSchemaMock.matchesPattern(lowerKey, ['weight', 'height', 'length', 'width', 'size'])) {
                prop.examples = [prop.type === 'integer' ? 100 : 100.5];
              } else {
                // Default to reasonable numbers
                prop.examples = [prop.type === 'integer' ? 42 : 42.5];
              }
            }
          }

          // Add examples for boolean properties
          if (prop.type === 'boolean' && !prop.examples && !prop.example && !prop.default) {
            const lowerKey = key.toLowerCase();
            // Smart defaults for boolean properties
            if (JsonSchemaMock.matchesPattern(lowerKey, ['active', 'enabled', 'verified', 'confirmed', 'approved'])) {
              prop.examples = [true];
            } else if (JsonSchemaMock.matchesPattern(lowerKey, ['disabled', 'deleted', 'archived', 'hidden'])) {
              prop.examples = [false];
            } else {
              prop.examples = [true];
            }
          }

          // Recursively process nested objects
          if (prop.type === 'object' || prop.properties) {
            enhancedSchema.properties[key] = JsonSchemaMock.addExamplesToSchema(prop);
          }

          // Process array items
          if (prop.type === 'array' && prop.items) {
            prop.items = JsonSchemaMock.addExamplesToSchema(prop.items);
          }
        }
      }
    }

    // Handle enum at the root level as well
    if (
      enhancedSchema.enum &&
      Array.isArray(enhancedSchema.enum) &&
      enhancedSchema.enum.length > 0 &&
      !enhancedSchema.examples &&
      !enhancedSchema.example
    ) {
      enhancedSchema.examples = [enhancedSchema.enum[0]];
    }

    return enhancedSchema;
  }
}
