import { PromoteTypeChangeCommand } from '../promote-type-change.command';

export interface ITranslationChangeService {
  execute(command: PromoteTypeChangeCommand): Promise<unknown>;
}

export interface ITranslationGroupChangeService {
  execute(command: PromoteTypeChangeCommand): Promise<unknown>;
}

export const TRANSLATION_CHANGE_SERVICE = 'ITranslationChangeService';
export const TRANSLATION_GROUP_CHANGE_SERVICE = 'ITranslationGroupChangeService';
