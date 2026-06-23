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

    const response = await axios.post<WebexTokenRefreshResponse>(this.WEBEX_ACCESS_TOKEN_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    return response.data;
  }
}
