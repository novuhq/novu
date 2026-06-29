import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface WebexTokenRefreshResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

@Injectable()
export class WebexTokenService {
  private readonly WEBEX_ACCESS_TOKEN_URL = 'https://webexapis.com/v1/access_token';

  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<WebexTokenRefreshResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    try {
      const response = await axios.post<WebexTokenRefreshResponse>(this.WEBEX_ACCESS_TOKEN_URL, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      this.handleRefreshError(error);
    }
  }

  private handleRefreshError(error: unknown): never {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const status = error.response?.status;
    const { code, message } = this.getWebexErrorDetails(error.response?.data);
    const detail = message || error.message;
    const statusText = status ? ` (HTTP ${status})` : '';

    if (code === 'invalid_grant') {
      throw new Error(
        `Webex refresh token is invalid or expired; re-authorize the Webex connection${statusText}: ${detail}`
      );
    }

    throw new Error(`Webex token refresh failed${statusText}: ${detail}`);
  }

  private getWebexErrorDetails(data: unknown): { code?: string; message: string } {
    if (typeof data === 'string') {
      return { message: data };
    }

    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>;
      const code = record.error !== undefined ? String(record.error) : undefined;
      const message =
        (record.error_description !== undefined ? String(record.error_description) : undefined) ||
        (record.message !== undefined ? String(record.message) : undefined) ||
        JSON.stringify(data);

      return { code, message };
    }

    return { message: data === undefined ? '' : JSON.stringify(data) };
  }
}
