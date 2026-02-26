export class TranslationEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
  _environmentId: string;
  _organizationId: string;
  _groupId: string;
  isoLanguage: string;
  translations: any;
  fileName: string;
  _parentId?: string;
}
