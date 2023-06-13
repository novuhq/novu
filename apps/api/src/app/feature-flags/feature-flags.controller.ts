import { ClassSerializerInterceptor, Controller, UseGuards, UseInterceptors } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/framework/auth.guard';

@Controller('/feature-flags')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class FeatureFlagsController {}
