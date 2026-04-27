import { PartialType } from '@nestjs/swagger';
import { DomainRouteDto } from './domain-route.dto';

export class UpdateDomainRouteDto extends PartialType(DomainRouteDto) {}
