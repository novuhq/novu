import { HttpService } from '@nestjs/axios';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { env } from '../../../config/env';
import { getMachineInfo, loadOrCreateMachineId } from '../utils/machine.utils';
import { sendDataToNovuTrace } from '../utils/sendDataToNovuTrace.utils';

@Injectable()
export class MachineInfoService implements OnApplicationBootstrap {
  private machineId: string;

  constructor(private readonly httpService: HttpService) {}

  private async sendMachineTelemetry(eventName: string) {
    const telemetryData = {
      distinct_id: this.machineId,
      instanceId: this.machineId,
      ...getMachineInfo(),
    };

    await sendDataToNovuTrace(this.httpService, eventName, telemetryData);
  }

  async onApplicationBootstrap() {
    if (env.IS_SELF_HOSTED && env.NOVU_ENTERPRISE === 'false') {
      this.machineId = loadOrCreateMachineId();
      await this.sendMachineTelemetry('Initial Setup - [OS Telemetry]');
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async sendRegularTelemetry() {
    if (env.IS_SELF_HOSTED && env.NOVU_ENTERPRISE === 'false') {
      await this.sendMachineTelemetry('Regular Beacon - [OS Telemetry]');
    }
  }
}
