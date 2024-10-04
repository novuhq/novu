import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { HealthCheck } from '@novu/framework';
import { GetBridgeStatusCommand } from './get-bridge-status.command';

const axiosInstance = axios.create();

@Injectable()
export class GetBridgeStatus {
  async execute(command: GetBridgeStatusCommand): Promise<HealthCheck> {
    try {
      const bridgeActionUrl = new URL(command.bridgeUrl);
      bridgeActionUrl.searchParams.set('action', 'health-check');

      const response = await axiosInstance.get<HealthCheck>(bridgeActionUrl.toString(), {
        headers: {
          'Bypass-Tunnel-Reminder': 'true',
          'content-type': 'application/json',
        },
      });

      return response.data;
    } catch (err: any) {
      throw new BadRequestException(`Bridge is not accessible. ${err.message}`);
    }
  }
}
