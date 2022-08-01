import { Injectable } from '@nestjs/common';
import { SubscriberPreferenceRepository, NotificationTemplateRepository, NotificationTemplateEntity } from '@novu/dal';
import { GetSubscriberPreferenceCommand } from './get-subscriber-preference.command';

@Injectable()
export class GetSubscriberPreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private notificationTemplateRepository: NotificationTemplateRepository
  ) {}

  async execute(command: GetSubscriberPreferenceCommand): Promise<any> {
    const templateList = await this.notificationTemplateRepository.getActiveList(
      command.organizationId,
      command.environmentId,
      true
    );

    const templatesIds = templateList.map((template) => template._id);

    const subscriberPreferences = await this.subscriberPreferenceRepository.findSubscriberPreferences(
      command.environmentId,
      command.subscriberId,
      templatesIds
    );

    const preferences = templateList.map((template) => {
      const currSubscriberPreference = subscriberPreferences.find(
        (preference) => preference._templateId === template._id
      );

      if (currSubscriberPreference) {
        return { template: template, preference: currSubscriberPreference };
      }

      /*
       * check template default fallback
       * add here the template(or fallback) is critical as well
       */

      return getNoSettingFallback(template);
    });

    /*
     * check what param the client need
     * and create response interface
     * remove useless params on repo query
     */

    return preferences;
  }
}

function getNoSettingFallback(template: NotificationTemplateEntity) {
  // add here the template(or fallback) is critical as well
  return {
    template: template,
    preference: {
      enabled: true,
      channels: { email: true, sms: true, in_app: true, direct: true, push: true },
    },
  };
}
