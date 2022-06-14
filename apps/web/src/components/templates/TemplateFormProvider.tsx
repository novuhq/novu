import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { FieldArrayProvider } from './FieldArrayProvider';
import { IForm } from './use-template-controller.hook';
import { ChannelTypeEnum } from '@novu/shared';

export const TemplateFormProvider = ({ children }) => {
  const methods = useForm<IForm>({
    resolver: async (data) => {
      const errors: any = {};
      let values = data;
      if (!data.name) {
        errors.name = 'Required field name';
      }

      if (!data.notificationGroup) {
        errors.notificationGroup = 'Required field notification group';
      }

      data.steps.map((step, index) => {
        if (
          (step.template.type === ChannelTypeEnum.SMS || step.template.type === ChannelTypeEnum.IN_APP) &&
          step.template.content.length === 0
        ) {
          errors[`steps.${index}.template.content`] = 'Required field content';
        }
        if (step.template.type === ChannelTypeEnum.EMAIL && !step.template.subject) {
          errors[`steps.${index}.template.subject`] = 'Required field subject';
        }
      });

      if (Object.keys(errors).length) {
        values = {} as any;
      }

      return {
        values,
        errors,
      };
    },
  });

  const steps = useFieldArray({
    control: methods.control,
    name: 'steps',
  });

  return (
    <FormProvider {...methods}>
      <FieldArrayProvider fieldArrays={{ steps }}>{children}</FieldArrayProvider>
    </FormProvider>
  );
};
