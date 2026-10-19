import { Reflector } from '@nestjs/core';
import { ProductFeatureKeyEnum } from '@novu/shared';

export const ProductFeature = Reflector.createDecorator<ProductFeatureKeyEnum>();
