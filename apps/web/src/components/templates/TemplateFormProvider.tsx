import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { FieldArrayProvider } from './FieldArrayProvider';
import { IForm } from './use-template-controller.hook';

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
