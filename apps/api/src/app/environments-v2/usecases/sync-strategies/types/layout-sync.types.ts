import { LayoutResponseDto } from '../../../../layouts-v2/dtos';

export type INormalizedLayout = Omit<
  LayoutResponseDto,
  | '_id' // Auto-generated database ID
  | 'updatedAt' // System timestamp
  | 'createdAt' // System timestamp
  | 'slug' // Auto-generated from name
  | 'isDefault' // Not relevant for comparison
  | 'origin' // Not relevant for comparison
  | 'type' // Not relevant for comparison
  | 'variables' // Not relevant for comparison
>;

export interface ILayoutComparison {
  layoutChanges: {
    previous: Partial<INormalizedLayout> | null;
    new: Partial<INormalizedLayout> | null;
  } | null;
}
