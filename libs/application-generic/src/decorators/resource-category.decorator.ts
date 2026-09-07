import { Reflector } from '@nestjs/core';
import { ResourceEnum } from '@novu/shared';

export const ResourceCategory = Reflector.createDecorator<ResourceEnum>();
