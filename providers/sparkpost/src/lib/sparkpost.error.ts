export interface ISparkPostErrorResponse {
  errors: Array<{
    description: string;
    code: string;
    message: string;
  }>;
}

export class SparkPostError extends Error implements ISparkPostErrorResponse {
  readonly errors: ISparkPostErrorResponse['errors'];

  constructor(response: ISparkPostErrorResponse, readonly statusCode: number) {
    super();
    this.errors = response.errors;
  }
}
