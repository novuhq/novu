import { Reflector } from '@nestjs/core';
import { ResourceEnum } from '@novu/shared';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ResourceCategory = Reflector.createDecorator<ResourceEnum>();
