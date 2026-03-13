import { TranslationEntity } from '../translations/translation.entity';

export class TranslationGroupEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  identifier: string;
  _environmentId: string;
  _organizationId: string;
  _parentId?: string;
}

export class TranslationGroupWithTranslations extends TranslationGroupEntity {
  translations: TranslationEntity[];
}
