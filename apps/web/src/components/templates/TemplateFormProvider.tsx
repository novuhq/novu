import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { FieldArrayProvider } from './FieldArrayProvider';
import { IForm } from './use-template-controller.hook';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChannelTypeEnum } from '@novu/shared';

const schema = z
  .object({
    name: z
      .string({
        required_error: 'Required - Notification Name',
      })
      .superRefine((data, ctx) => {
        if (data.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 1,
            type: 'string',
            inclusive: true,
            message: 'Required - Notification Name',
            path: ['name'],
          });
        }
      }),
    notificationGroup: z
      .string({
        invalid_type_error: 'Required - Notification Group',
      })
      .superRefine((data, ctx) => {
        if (data.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 1,
            type: 'string',
            inclusive: true,
            message: 'Required - Notification Group',
            path: ['notificationGroup'],
          });
        }
      }),
    steps: z
      .array(
        z
          .object({
            template: z
              .object({
                content: z.any(),
                subject: z.any(),
              })
              .passthrough()
              .superRefine((template: any, ctx) => {
                if (
                  (template.type === ChannelTypeEnum.SMS || template.type === ChannelTypeEnum.IN_APP) &&
                  template.content.length === 0
                ) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.too_small,
                    minimum: 1,
                    type: 'string',
                    inclusive: true,
                    message: 'Required - Message Content',
                    path: ['content'],
                  });
                }
                if (template.type === ChannelTypeEnum.EMAIL && !template.subject) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.too_small,
                    minimum: 1,
                    type: 'string',
                    inclusive: true,
                    message: 'Required - Email Subject',
                    path: ['subject'],
                  });
                }
              }),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const TemplateFormProvider = ({ children }) => {
  const methods = useForm<IForm>({
    resolver: zodResolver(schema),
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
