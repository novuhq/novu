/* eslint-disable @typescript-eslint/no-throw-literal */
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  BadRequestException,
  ServerException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from './exceptions';

export interface INovuConfiguration {
  backendUrl?: string;
}

export class WithHttp {
  protected readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }

  async getRequest(
    path: string,
    params?: Record<string, unknown>
  ): Promise<AxiosResponse> {
    try {
      if (params) {
        return await this.http.get(path, params);
      } else {
        return await this.http.get(path);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    }
  }

  async postRequest(path: string, data?: unknown): Promise<AxiosResponse> {
    try {
      if (data) {
        return await this.http.post(path, data);
      } else {
        return await this.http.post(path);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    }
  }

  async deleteRequest(
    path: string,
    params?: Record<string, unknown>
  ): Promise<AxiosResponse> {
    try {
      if (params) {
        return await this.http.delete(path, params);
      } else {
        return await this.http.delete(path);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    }
  }

  async patchRequest(path: string, data?: unknown): Promise<AxiosResponse> {
    try {
      if (data) {
        return await this.http.patch(path, data);
      } else {
        return await this.http.patch(path);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    }
  }

  async putRequest(path: string, data?: unknown): Promise<AxiosResponse> {
    try {
      if (data) {
        return await this.http.put(path, data);
      } else {
        return await this.http.put(path);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    }
  }

  handleError(error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401: {
          const { message } = data;
          throw new UnauthorizedException(message);
        }
        case 400: {
          const { message } = data;
          throw new BadRequestException(message);
        }
        case 422: {
          const { message } = data;
          throw new UnprocessableEntityException(message);
        }
        case 404: {
          const { message } = data;
          throw new NotFoundException(message);
        }
        default: {
          throw new ServerException(status, data.message);
        }
      }
    }
  }
}
