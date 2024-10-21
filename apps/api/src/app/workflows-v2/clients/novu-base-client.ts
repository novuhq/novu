// Base HttpError class with response field
export class HttpError extends Error {
  constructor(
    public responseText: string,
    public status: number,
    public response: Response // Add response field
  ) {
    super(`${status}: ${responseText}`);
    this.name = this.constructor.name;
  }

  toString(): string {
    return `${this.name} (status: ${this.status}): ${this.responseText}`;
  }
}

// Specific error classes extending HttpError
export class NovuBadRequestError extends HttpError {}
export class NovuUnauthorizedError extends HttpError {}
export class NovuForbiddenError extends HttpError {}
export class NovuNotFoundError extends HttpError {}
export class NovuInternalServerError extends HttpError {}
export class NovuNotImplementedError extends HttpError {}
export class NovuBadGatewayError extends HttpError {}
export class NovuServiceUnavailableError extends HttpError {}
export class NovuGatewayTimeoutError extends HttpError {}
export class NovuRedirectError extends HttpError {
  redirectUrl: string;

  constructor(responseText: string, status: number, redirectUrl: string, response: Response) {
    super(responseText, status, response); // Pass response to the base class
    this.redirectUrl = redirectUrl;
  }
}

// Map of status codes to specific error classes
const errorMap: Record<number, new (responseText: string, status: number, response: Response) => HttpError> = {
  400: NovuBadRequestError,
  401: NovuUnauthorizedError,
  403: NovuForbiddenError,
  404: NovuNotFoundError,
  500: NovuInternalServerError,
  501: NovuNotImplementedError,
  502: NovuBadGatewayError,
  503: NovuServiceUnavailableError,
  504: NovuGatewayTimeoutError,
};

// Type for the fetch function
type FetchFunction = () => Promise<Response>;

// Result class for handling success and failure
export class NovuRestResult<T, E> {
  public isSuccess: boolean;
  public value?: T;
  public error?: E;

  private constructor(isSuccess: boolean, value?: T, error?: E) {
    this.isSuccess = isSuccess;
    this.value = value;
    this.error = error;
  }

  static ok<T>(value: T): NovuRestResult<T, never> {
    return new NovuRestResult<T, never>(true, value);
  }

  static fail<E>(error: E): NovuRestResult<never, E> {
    return new NovuRestResult<never, E>(false, undefined as never, error);
  }

  public isSuccessResult(): this is { value: T; error: never } {
    return this.isSuccess;
  }
}

// Functional version of NovuBaseClient
export const createNovuBaseClient = (baseUrl: string, headers: HeadersInit = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const buildUrl = (endpoint: string): string => `${baseUrl}${endpoint}`;

  const safeFetch = async <T>(url: string, fetchFunc: FetchFunction): Promise<NovuRestResult<T, HttpError>> => {
    const response: Response = await fetchFunc();

    if (response.ok) {
      const jsonData = await response.json();

      return NovuRestResult.ok(jsonData.data);
    }

    if (response.status >= 300 && response.status < 400) {
      const responseText = await getErrorResponse(response);
      const redirectError = new NovuRedirectError(
        responseText,
        response.status,
        response.headers.get('Location') || '',
        response // Pass the response object
      );

      return NovuRestResult.fail(redirectError);
    }

    const ErrorClass = errorMap[response.status] || HttpError;
    const responseText = await getErrorResponse(response);
    const errorResult = new ErrorClass(responseText, response.status, response); // Pass the response object

    return NovuRestResult.fail(errorResult);
  };

  async function getErrorResponse(response: Response): Promise<string> {
    // Try to parse the response as JSON
    try {
      const json = await response.json();

      return JSON.stringify(json); // Return the JSON as a string
    } catch {
      // If JSON parsing fails, fallback to text response
      return await response.text();
    }
  }

  const safeGet = async <T>(endpoint: string): Promise<NovuRestResult<T, HttpError>> => {
    return await safeFetch(endpoint, () =>
      fetch(buildUrl(endpoint), {
        method: 'GET',
        headers: defaultHeaders,
      })
    );
  };

  const safePut = async <T>(endpoint: string, data: object): Promise<NovuRestResult<T, HttpError>> => {
    return await safeFetch(endpoint, () =>
      fetch(buildUrl(endpoint), {
        method: 'PUT',
        headers: defaultHeaders,
        body: JSON.stringify(data),
      })
    );
  };

  const safePost = async <T>(endpoint: string, data: object): Promise<NovuRestResult<T, HttpError>> => {
    return await safeFetch(endpoint, () =>
      fetch(buildUrl(endpoint), {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(data),
      })
    );
  };

  const safeDelete = async (endpoint: string): Promise<NovuRestResult<void, HttpError>> => {
    return await safeFetch(endpoint, () =>
      fetch(buildUrl(endpoint), {
        method: 'DELETE',
        headers: defaultHeaders,
      })
    );
  };

  return {
    safeGet,
    safePut,
    safePost,
    safeDelete,
  };
};
