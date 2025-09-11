import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { MasterJsonResponse, OrganizationSettingsResponse, UploadResponse } from './types';

export class TranslationClient {
  constructor(
    private apiUrl: string,
    private secretKey: string
  ) {}

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${this.secretKey}`,
    };
  }

  async getMasterJson(locale: string): Promise<MasterJsonResponse> {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/translations/master-json`, {
        params: { locale },
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`No translations found for locale: ${locale}`);
        }
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your secret key.');
        }
        throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async uploadMasterJson(filePath: string): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', createReadStream(filePath));

      const response = await axios.post(`${this.apiUrl}/v2/translations/master-json/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `ApiKey ${this.secretKey}`,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your secret key.');
        }
        if (error.response?.status === 400) {
          const apiMessage = error.response?.data?.message || error.response?.data?.error || 'Invalid request format';
          throw new Error(`Bad request: ${apiMessage}`);
        }
        if (error.response?.status === 404) {
          throw new Error('Upload endpoint not found. Please check your API URL.');
        }
        if (error.response?.status >= 500) {
          throw new Error(
            `Server error (${error.response.status}): ${error.response?.data?.message || 'Internal server error'}`
          );
        }

        const apiMessage =
          error.response?.data?.message || error.response?.data?.error || error.message || 'Request failed';
        throw new Error(`Upload failed (${error.response?.status || 'unknown'}): ${apiMessage}`);
      }

      if (error instanceof Error) {
        throw new Error(`Network error: ${error.message}`);
      }

      throw new Error('Unknown upload error occurred');
    }
  }

  async validateConnection(): Promise<void> {
    try {
      await axios.get(`${this.apiUrl}/v1/users/me`, {
        headers: {
          Authorization: `ApiKey ${this.secretKey}`,
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your secret key.');
        }
        throw new Error(`Connection failed: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getOrganizationSettings(): Promise<OrganizationSettingsResponse> {
    try {
      const response = await axios.get(`${this.apiUrl}/v1/organizations/settings`, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your secret key.');
        }
        if (error.response?.status === 404) {
          throw new Error('Organization settings not found. Please ensure your API key has proper permissions.');
        }
        const apiMessage =
          error.response?.data?.message || error.response?.data?.error || 'Failed to fetch organization settings';
        throw new Error(`Settings API error: ${apiMessage}`);
      }
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
