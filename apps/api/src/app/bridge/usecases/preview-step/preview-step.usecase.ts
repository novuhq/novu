import { createHmac } from 'crypto';
import axios from 'axios';
import { BadRequestException, Injectable } from '@nestjs/common';

import { EnvironmentRepository } from '@novu/dal';
import { decryptApiKey } from '@novu/application-generic';

import { PreviewStepCommand } from './preview-step.command';
import { BridgeErrorCodeEnum } from '../../shared';

@Injectable()
export class PreviewStep {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: PreviewStepCommand) {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });
    const bridgeUrl = command.bridgeUrl || environment?.echo.url;
    if (!bridgeUrl) {
      throw new BadRequestException('Bridge URL not found');
    }

    const axiosInstance = axios.create();
    try {
      const payload = this.mapPayload(command);
      const novuSignatureHeader = this.buildNovuSignature(environment, payload);
      const url = `${bridgeUrl}?action=preview&workflowId=${command.workflowId}&stepId=${command.stepId}`;

      const response = await axiosInstance.post(url, payload, {
        headers: {
          'content-type': 'application/json',
          'x-novu-signature': novuSignatureHeader,
          'novu-signature': novuSignatureHeader,
        },
      });

      if (!response.data?.outputs || !response.data?.metadata) {
        throw new BadRequestException({
          code: BridgeErrorCodeEnum.BRIDGE_UNEXPECTED_RESPONSE,
          message: JSON.stringify(response.data),
        });
      }

      return response.data;
    } catch (e: any) {
      if (e?.response?.status === 404) {
        throw new BadRequestException({
          code: BridgeErrorCodeEnum.BRIDGE_ENDPOINT_NOT_FOUND,
          message: `Bridge Endpoint Was not found or not accessible. Endpoint: ${bridgeUrl}`,
        });
      }

      if (e?.response?.status === 405) {
        throw new BadRequestException({
          code: BridgeErrorCodeEnum.BRIDGE_ENDPOINT_NOT_FOUND,
          message: `Bridge Endpoint is not properly configured. : ${bridgeUrl}`,
        });
      }

      if (e.code === BridgeErrorCodeEnum.BRIDGE_UNEXPECTED_RESPONSE) {
        throw e;
      }

      // todo add status indication - check if e?.response?.status === 400 here
      if (e?.response?.data) {
        throw new BadRequestException(e.response.data);
      }

      throw new BadRequestException({
        code: BridgeErrorCodeEnum.BRIDGE_UNEXPECTED_RESPONSE,
        message: `Un-expected Bridge response: ${e.message}`,
      });
    }
  }

  private mapPayload(command: PreviewStepCommand) {
    const payload = {
      inputs: command.controls || command.inputs || {},
      controls: command.controls || command.inputs || {},
      data: command.data || {},
      state: [
        {
          stepId: 'trigger',
          outputs: command.data || {},
        },
      ],
    };

    return payload;
  }

  private buildNovuSignature(
    environment,
    payload: { data: any; inputs: any; controls: any; state: { outputs: any; stepId: string }[] }
  ) {
    const timestamp = Date.now();
    const xNovuSignature = `t=${timestamp},v1=${this.createHmacByApiKey(
      environment.apiKeys[0].key,
      timestamp,
      payload
    )}`;

    return xNovuSignature;
  }

  private createHmacByApiKey(secret: string, timestamp: number, payload) {
    const publicKey = `${timestamp}.${JSON.stringify(payload)}`;

    return createHmac('sha256', decryptApiKey(secret)).update(publicKey).digest('hex');
  }
}
