import { ClassSerializerInterceptor, Controller, Get, Param, UseInterceptors } from '@nestjs/common';

import { GroupedBlueprintResponse } from './dto/grouped-blueprint.response.dto';
import { GetBlueprint, GetBlueprintCommand } from './usecases/get-blueprint';
import { GetGroupedBlueprints } from './usecases/get-grouped-blueprints';
import { GetBlueprintResponse } from './dto/get-blueprint.response.dto';
import { ApiCommonResponses } from '../shared/framework/response.decorator';

@ApiCommonResponses()
@Controller('/blueprints')
@UseInterceptors(ClassSerializerInterceptor)
export class BlueprintController {
  constructor(private getBlueprintUsecase: GetBlueprint, private getGroupedBlueprintsUsecase: GetGroupedBlueprints) {}

  @Get('/group-by-category')
  getGroupedBlueprints(): Promise<GroupedBlueprintResponse> {
    return this.getGroupedBlueprintsUsecase.execute();
  }

  @Get('/:templateId')
  getBlueprintById(@Param('templateId') templateId: string): Promise<GetBlueprintResponse> {
    return this.getBlueprintUsecase.execute(
      GetBlueprintCommand.create({
        templateId,
      })
    );
  }
}
