import { Injectable } from '@nestjs/common';
import { PinoLogger, StorageService } from '@novu/application-generic';

import type { MascotLook } from '../../../human/services/agent-picture-url';
import { type AgentProfilePicture, readAgentProfilePicture } from '../../../human/services/agent-profile-picture';
import { resolveWhatsAppAppId } from './whatsapp-credentials.utils';
import {
  extractMetaError,
  getTokenAppId,
  getWhatsAppBusinessProfile,
  type UpdateWhatsAppBusinessProfileBody,
  updateWhatsAppBusinessProfile,
  uploadFileToMeta,
} from './whatsapp-graph-api.utils';

/** Meta's own limits for the about text and the description of a business profile. */
const ABOUT_MAX_LENGTH = 139;
const DESCRIPTION_MAX_LENGTH = 512;

export type WhatsAppBusinessNumber = {
  accessToken: string;
  phoneNumberId: string;
  /** Connected through Novu's Meta app (Embedded Signup), so uploads go through that app. */
  isNovuManaged?: boolean;
};

export type WhatsAppBusinessProfileFields = {
  /** An empty one clears the description; the about text, which can't be empty, keeps what it had. */
  description?: string;
  /** WhatsApp has no way to take a photo away, so `null` puts the default one there instead. */
  picture?: AgentProfilePicture;
  /** The look the agent's mascots show. Where the default picture would go, the mascot in this look goes instead. */
  mascot?: MascotLook | null;
};

/**
 * Sets what people see of a WhatsApp business number: the photo, the about text and the description on its
 * profile. Its display name can't be set here: Meta reviews every name change.
 *
 * None of this is needed to deliver a message, so a refusal is logged and nothing is thrown.
 */
@Injectable()
export class WhatsAppBusinessProfile {
  constructor(
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async apply(number: WhatsAppBusinessNumber, { description, picture, mascot }: WhatsAppBusinessProfileFields) {
    const profile: UpdateWhatsAppBusinessProfileBody = {};

    if (description !== undefined) {
      const text = description.trim();
      profile.description = cut(text, DESCRIPTION_MAX_LENGTH);
      if (text) {
        profile.about = cut(text, ABOUT_MAX_LENGTH);
      }
    }

    const handle = await this.uploadPicture(number, picture, mascot);
    if (handle) {
      profile.profile_picture_handle = handle;
    }

    if (Object.keys(profile).length === 0) {
      return;
    }

    try {
      const response = await updateWhatsAppBusinessProfile({
        accessToken: number.accessToken,
        phoneNumberId: number.phoneNumberId,
        profile,
      });
      const error = extractMetaError(response.body);

      if (error || response.statusCode >= 400 || response.body?.success === false) {
        this.logger.warn(
          { phoneNumberId: number.phoneNumberId, statusCode: response.statusCode, reason: error?.message },
          'Meta refused a WhatsApp business profile update.'
        );
      }
    } catch (err) {
      this.logger.warn(
        { phoneNumberId: number.phoneNumberId, reason: failureReason(err, number.accessToken) },
        'Could not reach Meta to update a WhatsApp business profile.'
      );
    }
  }

  /** The handle of the picture to set, or nothing when the photo stays as it is. */
  private async uploadPicture(
    number: WhatsAppBusinessNumber,
    picture: WhatsAppBusinessProfileFields['picture'],
    mascot: WhatsAppBusinessProfileFields['mascot']
  ): Promise<string | undefined> {
    if (picture === undefined) {
      return undefined;
    }

    try {
      if (picture === 'default-if-none' && !(await this.hasNoPhoto(number))) {
        return undefined;
      }

      const appId = await this.appIdOf(number);
      if (!appId) {
        this.logger.warn(
          { phoneNumberId: number.phoneNumberId },
          'Could not tell which Meta app to upload a WhatsApp profile photo through, so it was left alone.'
        );

        return undefined;
      }

      const { file, contentType } = await readAgentProfilePicture(this.storageService, picture, mascot);
      const upload = await uploadFileToMeta({
        accessToken: number.accessToken,
        appId,
        file,
        contentType,
        fileName: contentType === 'image/png' ? 'agent-picture.png' : 'agent-picture.jpg',
      });

      if (!upload.handle) {
        this.logger.warn(
          { phoneNumberId: number.phoneNumberId, statusCode: upload.statusCode, reason: upload.error?.message },
          'Meta refused the upload of a WhatsApp profile photo.'
        );
      }

      return upload.handle;
    } catch (err) {
      this.logger.warn(
        { phoneNumberId: number.phoneNumberId, reason: failureReason(err, number.accessToken) },
        'Could not set the photo of a WhatsApp business number.'
      );

      return undefined;
    }
  }

  /**
   * Whether Meta says plainly that the number has no photo. Anything less counts as having one, so a failed
   * check never costs a business the photo it set in WhatsApp Manager.
   */
  private async hasNoPhoto(number: WhatsAppBusinessNumber): Promise<boolean> {
    const response = await getWhatsAppBusinessProfile(number.accessToken, number.phoneNumberId);
    const profile = response.body?.data?.[0];

    if (response.statusCode >= 400 || extractMetaError(response.body) || !profile) {
      this.logger.warn(
        { phoneNumberId: number.phoneNumberId, statusCode: response.statusCode },
        'Could not tell whether a WhatsApp business number has a photo, so it was left alone.'
      );

      return false;
    }

    return !profile.profile_picture_url;
  }

  private async appIdOf(number: WhatsAppBusinessNumber): Promise<string | undefined> {
    if (number.isNovuManaged) {
      return resolveWhatsAppAppId({ isNovuManaged: true });
    }

    const response = await getTokenAppId(number.accessToken);

    return response.statusCode < 400 && typeof response.body?.id === 'string' ? response.body.id : undefined;
  }
}

/** The text cut to at most `length` characters, never through the middle of an emoji. */
function cut(text: string, length: number): string {
  const characters = Array.from(text);

  return characters.length > length ? characters.slice(0, length).join('') : text;
}

/** What went wrong, fit for a log: an error's message must never carry the access token. */
function failureReason(err: unknown, accessToken: string): string {
  return (err instanceof Error ? err.message : String(err)).split(accessToken).join('<access token>');
}
