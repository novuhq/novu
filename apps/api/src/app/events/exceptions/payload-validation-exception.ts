import { BadRequestException } from '@nestjs/common';
import { ErrorObject } from 'ajv';

export interface IPayloadValidationError {
  field: string;
  message: string;
  value?: any;
  schemaPath?: string;
}

export class PayloadValidationException extends BadRequestException {
  constructor(
    public validationErrors: IPayloadValidationError[],
    public schema?: any
  ) {
    const errorMessage = `Payload validation failed: ${validationErrors.map((err) => `${err.field}: ${err.message}`).join('; ')}`;

    super({
      message: errorMessage,
      errors: validationErrors,
      schema,
      type: 'PAYLOAD_VALIDATION_ERROR',
    });
  }

  static fromAjvErrors(ajvErrors: ErrorObject[], payload: any, schema: any): PayloadValidationException {
    const validationErrors: IPayloadValidationError[] = ajvErrors.map((error: ErrorObject) => {
      const path = error.instancePath ? error.instancePath.replace(/^\//, '').replace(/\//g, '.') : 'root';
      const field = error.params?.missingProperty ? `${path ? `${path}.` : ''}${error.params.missingProperty}` : path;

      // Get the actual value that failed validation
      let value: any;
      try {
        if (error.instancePath) {
          const pathParts = error.instancePath.split('/').filter(Boolean);
          value = pathParts.reduce((obj, key) => obj?.[key], payload);
        } else {
          value = payload;
        }
      } catch {
        value = undefined;
      }

      return {
        field,
        message: error.message || 'Validation failed',
        value,
        schemaPath: error.schemaPath,
      };
    });

    return new PayloadValidationException(validationErrors, schema);
  }
}
