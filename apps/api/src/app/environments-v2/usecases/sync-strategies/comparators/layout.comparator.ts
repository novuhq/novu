import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { LayoutEntity } from '@novu/dal';
import { diff } from 'deep-object-diff';
import { GetLayoutCommand, GetLayoutUseCase } from '../../../../layouts-v2/usecases/get-layout';
import { LayoutNormalizer } from '../normalizers/layout.normalizer';
import { ILayoutComparison, INormalizedLayout } from '../types/layout-sync.types';

@Injectable()
export class LayoutComparator {
  constructor(
    private logger: PinoLogger,
    private getLayoutUseCase: GetLayoutUseCase,
    private layoutNormalizer: LayoutNormalizer
  ) {}

  async compareLayouts(sourceLayout: LayoutEntity, targetLayout: LayoutEntity): Promise<ILayoutComparison> {
    try {
      if (!sourceLayout || !targetLayout) {
        throw new Error('Source and target layouts must not be null');
      }

      const [sourceLayoutDto, targetLayoutDto] = await Promise.all([
        this.getLayoutUseCase.execute(
          GetLayoutCommand.create({
            layoutIdOrInternalId: sourceLayout._id,
            environmentId: sourceLayout._environmentId,
            organizationId: sourceLayout._organizationId,
          })
        ),
        this.getLayoutUseCase.execute(
          GetLayoutCommand.create({
            layoutIdOrInternalId: targetLayout._id,
            environmentId: targetLayout._environmentId,
            organizationId: targetLayout._organizationId,
          })
        ),
      ]);

      const normalizedSource = this.layoutNormalizer.normalizeLayout(sourceLayoutDto);
      const normalizedTarget = this.layoutNormalizer.normalizeLayout(targetLayoutDto);

      const layoutDifferences = diff(normalizedTarget, normalizedSource);

      let layoutChanges: {
        previous: Partial<INormalizedLayout> | null;
        new: Partial<INormalizedLayout> | null;
      } | null = null;

      if (Object.keys(layoutDifferences).length > 0) {
        layoutChanges = {
          previous: normalizedTarget,
          new: normalizedSource,
        };
      }

      return { layoutChanges };
    } catch (error) {
      this.logger.error({ err: error }, `Failed to compare layouts ${error.message}`);

      return { layoutChanges: null };
    }
  }
}
