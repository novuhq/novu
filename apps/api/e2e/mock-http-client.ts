import { HTTPClient, HTTPClientOptions } from '@novu/api/lib/http';

export class MockHTTPClient extends HTTPClient {
  private mockResponses: Map<string, Array<{ response: Response; remaining: number }>> = new Map();
  private recordedRequests: Array<{ request: Request; response: Response }> = [];

  constructor(mockConfigs: MockConfig[] = [], options: HTTPClientOptions = {}) {
    super(options);
    this.initializeMockResponses(mockConfigs);
  }

  /**
   * Initializes mock responses from the provided mock configurations.
   * @param mockConfigs An array of mock configuration objects.
   */
  private initializeMockResponses(mockConfigs: MockConfig[]) {
    mockConfigs.forEach(({ baseUrl, path, method, responseCode, responseJson, times }) => {
      const url = new URL(path, baseUrl).toString();
      const response = new Response(JSON.stringify(responseJson), {
        status: responseCode,
        headers: { 'Content-Type': 'application/json' },
      });

      const parsedUrl = new URL(url);
      const key = parsedUrl.pathname + method; // Use pathname instead of the full URL

      if (!this.mockResponses.has(key)) {
        this.mockResponses.set(key, []);
      }

      this.mockResponses.get(key)!.push({ response, remaining: times });
    });
  }

  /**
   * Overrides the request method to return mock responses.
   * @param request The Request object containing the request details.
   * @returns A Promise that resolves to the mock response or an error if no mocks are available.
   */
  async request(request: Request): Promise<Response> {
    const { url } = request;
    const { method } = request;

    // Parse the URL to get the pathname without query parameters
    const parsedUrl = new URL(url);
    const key = parsedUrl.pathname + method; // Use pathname instead of the full URL

    if (this.mockResponses.has(key)) {
      const responses = this.mockResponses.get(key)!;

      for (let i = 0; i < responses.length; i += 1) {
        const responseConfig = responses[i];
        if (responseConfig.remaining > 0) {
          responseConfig.remaining -= 1;

          this.recordedRequests.push({ request, response: responseConfig.response });

          if (responseConfig.remaining === 0) {
            responses.splice(i, 1);
          }

          if (responses.length === 0) {
            this.mockResponses.delete(key);
          }

          return responseConfig.response.clone();
        }
      }

      this.mockResponses.delete(key);
      throw new Error(`No remaining mock responses for ${parsedUrl.pathname} ${method}`);
    }
    throw new Error(`No remaining mock responses for ${key} Existing: ${Object.keys(this.mockResponses)} `);
  }

  /**
   * Getter to access recorded requests and responses.
   * @returns An array of recorded requests and their corresponding responses.
   */
  getRecordedRequests(): Array<{ request: Request; response: Response }> {
    return this.recordedRequests;
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface MockConfig {
  baseUrl: string;
  path: string;
  method: string;
  responseCode: number;
  responseJson: unknown;
  times: number;
}
