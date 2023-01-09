import { Controller, Inject, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { AnalyticsService } from '../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../shared/shared.module';

@Controller('/layouts')
@ApiTags('Layouts')
@UseGuards(JwtAuthGuard)
export class LayoutsController {
  constructor(@Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService) {}
}
