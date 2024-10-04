import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { getMachineInfo, loadOrCreateMachineId } from '../utils/machine.utils';
import { sendDataToMixpanel } from '../utils/sendDataToMixpanel.utils';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MachineInfoService {
  private machineId: string;

  constructor(private readonly httpService: HttpService) {}

  private async sendMachineTelemetry(eventName: string) {
    const telemetryData = {
      distinct_id: this.machineId,
      instanceId: this.machineId,
      ...getMachineInfo(),
    };

    await sendDataToMixpanel(this.httpService, eventName, telemetryData);
  }

  async onApplicationBootstrap() {
    if (process.env.IS_SELF_HOSTED === 'true') {
      this.machineId = loadOrCreateMachineId();
      await this.sendMachineTelemetry('Initial Setup - [OS Telemetry]');
    } else {
      Logger.log('Skipping this');
      Logger;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async sendRegularTelemetry() {
    if (process.env.IS_SELF_HOSTED === 'true') {
      await this.sendMachineTelemetry('Regular Beacon - [OS Telemetry]');
    }
  }
}
