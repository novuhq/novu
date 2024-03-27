import { Reflector } from '@nestjs/core';
import { ProductFeatureKeyEnum } from '@novu/shared';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ProductFeature = Reflector.createDecorator<ProductFeatureKeyEnum>();
