import { Control, Controller, useWatch } from 'react-hook-form';
import { formatDistanceToNow, subMinutes } from 'date-fns';
import { Group } from '@mantine/core';
import { InAppWidgetPreview } from '../../widget/InAppWidgetPreview';
import { ContentContainer } from './content/ContentContainer';
import { IForm } from '../use-template-controller.hook';
import AvatarContainer from '../../widget/AvatarContainer';
import { Text, colors } from '../../../design-system';

function minutesAgo(num: number): string {
  return formatDistanceToNow(subMinutes(new Date(), num), { addSuffix: true });
}

export function InAppEditorBlock({
  contentPlaceholder,
  control,
  index,
  readonly,
}: {
  contentPlaceholder: string;
  control: Control<IForm>;
  index: number;
  readonly: boolean;
}) {
  const enableAvatar = useWatch({
    name: `steps.${index}.template.enableAvatar`,
    control,
  });

  return (
    <Controller
      name={`steps.${index}.template.cta.action` as any}
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        const { ref, ...fieldRefs } = field;

        return (
          <InAppWidgetPreview {...fieldRefs} readonly={readonly}>
            <Group position="left">
              {enableAvatar && <AvatarContainerController control={control} index={index} />}

              <div>
                <Text weight="bold">
                  <ContentContainerController
                    control={control}
                    index={index}
                    contentPlaceholder={contentPlaceholder}
                    readonly={readonly}
                  />
                </Text>
                <Text mt={5} color={colors.B60}>
                  {minutesAgo(5)}
                </Text>
              </div>
            </Group>
          </InAppWidgetPreview>
        );
      }}
    />
  );
}

function ContentContainerController({
  contentPlaceholder,
  control,
  index,
  readonly,
}: {
  contentPlaceholder: string;
  control: Control<IForm>;
  index: number;
  readonly: boolean;
}) {
  return (
    <Controller
      name={`steps.${index}.template.content` as any}
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        const { ref, ...fieldRefs } = field;

        return (
          <ContentContainer {...fieldRefs} contentPlaceholder={contentPlaceholder} readonly={readonly} index={index} />
        );
      }}
    />
  );
}

function AvatarContainerController({ control, index }: { control: Control<IForm>; index: number }) {
  return (
    <Controller
      name={`steps.${index}.template.avatarDetails` as any}
      control={control}
      render={({ field }) => {
        const { ref, ...fieldRefs } = field;

        return <AvatarContainer {...fieldRefs} />;
      }}
    />
  );
}
