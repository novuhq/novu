import { Controller, Get, HttpException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PinoLogger } from '../logging';
import { ProfilingService } from './profiling.service';

@Controller('/debug/pprof')
@ApiExcludeController()
export class HealthController {
  constructor(
    private logger: PinoLogger,
    private pyroscope: ProfilingService
  ) {}

  @Get('/profile')
  async profileCPU(): Promise<Buffer> {
    try {
      return await this.pyroscope.collectCPU();
    } catch (e) {
      this.logger.error('Unable to get CPU Profile');
      throw new HttpException(`Error getting CPU Profile`, 500);
    }
  }

  @Get('/heap')
  async profileHEAY(): Promise<Buffer> {
    try {
      return await this.pyroscope.collectHeap();
    } catch (e) {
      this.logger.error('Unable to get Heap Profile');
      throw new HttpException(`Error getting Heap Profile`, 500);
    }
  }
}
