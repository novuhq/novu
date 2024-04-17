import { ClassSerializerInterceptor, Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';

import { GroupedBlueprintResponse } from './dto/grouped-blueprint.response.dto';
import { GetBlueprint, GetBlueprintCommand } from './usecases/get-blueprint';
import { GetGroupedBlueprints, GetGroupedBlueprintsCommand } from './usecases/get-grouped-blueprints';
import { GetBlueprintResponse } from './dto/get-blueprint.response.dto';
import { ApiCommonResponses } from '../shared/framework/response.decorator';

@ApiCommonResponses()
@Controller('/blueprints')
@UseInterceptors(ClassSerializerInterceptor)
export class BlueprintController {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private getBlueprintUsecase: GetBlueprint,
    private getGroupedBlueprintsUsecase: GetGroupedBlueprints
  ) {}

  @Get('/group-by-category')
  async getGroupedBlueprints(): Promise<GroupedBlueprintResponse> {
    const prodEnvironmentId = await this.getProdEnvironmentId();

    return this.getGroupedBlueprintsUsecase.execute(
      GetGroupedBlueprintsCommand.create({ environmentId: prodEnvironmentId })
    );
  }

  private async getProdEnvironmentId() {
    const productionEnvironmentId = (
      await this.environmentRepository.findOrganizationEnvironments(
        NotificationTemplateRepository.getBlueprintOrganizationId() || ''
      )
    )?.find((env) => env.name === 'Production')?._id;

    if (!productionEnvironmentId) {
      throw new Error('Production environment id was not found');
    }

    return productionEnvironmentId;
  }

  @Get('/:templateIdOrIdentifier')
  getBlueprintById(@Param('templateIdOrIdentifier') templateIdOrIdentifier: string): Promise<GetBlueprintResponse> {
    return this.getBlueprintUsecase.execute(
      GetBlueprintCommand.create({
        templateIdOrIdentifier,
      })
    );
  }
}
