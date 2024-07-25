import { BadRequestException, Injectable } from '@nestjs/common';
import { GetBridgeStatusCommand } from './get-bridge-status.command';
import axios from 'axios';
import { HealthCheck } from '@novu/framework';

const axiosInstance = axios.create();

@Injectable()
export class GetBridgeStatus {
  async execute(command: GetBridgeStatusCommand): Promise<HealthCheck> {
    try {
      const response = await axiosInstance.get<HealthCheck>(`${command.bridgeUrl}?action=health-check`, {
        headers: {
          'Bypass-Tunnel-Reminder': 'true',
          'content-type': 'application/json',
        },
      });

      return response.data;
    } catch (err: any) {
      throw new BadRequestException('Bridge URL is not accessible. ' + err.message);
    }
  }
}
