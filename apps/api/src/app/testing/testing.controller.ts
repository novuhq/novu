import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { DalService } from '@novu/dal';
import { IUserEntity } from '@novu/shared';
import { ISeedDataResponseDto, SeedDataBodyDto } from './dtos/seed-data.dto';
import { SeedData } from './usecases/seed-data/seed-data.usecase';
import { SeedDataCommand } from './usecases/seed-data/seed-data.command';
import { CreateSession } from './usecases/create-session/create-session.usecase';
import { CreateSessionCommand } from './usecases/create-session/create-session.command';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('/testing')
@ApiExcludeController()
export class TestingController {
  constructor(
    private seedDataUsecase: SeedData,
    private dalService: DalService,
    private createSessionUsecase: CreateSession
  ) {}

  @Post('/clear-db')
  async clearDB(@Body() body: SeedDataBodyDto): Promise<{ ok: boolean }> {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();

    await this.dalService.destroy();

    return {
      ok: true,
    };
  }

  /**
   * Used for seeding data for client e2e tests,
   * Currently just creates a new user session and returns signed JWT
   */
  @Post('/session')
  async getSession(@Body() body: SeedDataBodyDto): Promise<ISeedDataResponseDto> {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();
    const command = CreateSessionCommand.create({});

    return await this.createSessionUsecase.execute(command);
  }

  @Post('/seed')
  async seedData(@Body() body: SeedDataBodyDto): Promise<{ password_user: IUserEntity }> {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();
    const command = SeedDataCommand.create({});

    return await this.seedDataUsecase.execute(command);
  }
}
