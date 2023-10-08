import { useMemo } from 'react';
import { ScrollArea } from '@mantine/core';
import { StepTypeEnum } from '@novu/shared';
import { useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router-dom';

import { VariantItemCard } from './VariantItemCard';
import { VariantsListSidebar } from './VariantsListSidebar';

export function VariantsPage() {
  const { control, watch } = useFormContext();
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum | undefined;
    stepUuid: string;
  }>();

  const steps = watch('steps');

  const index = useMemo(
    () => steps.findIndex((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );
  const variants = useWatch({ control, name: `steps.${index}.variants` });
  if (!channel) {
    return null;
  }

  return (
    <>
      <VariantsListSidebar variantsCount={variants?.length ?? 0}>
        <ScrollArea h="calc(100vh - 220px)" offsetScrollbars mr={-12}>
          {/*<div*/}
          {/*  key={steps[index]._id}*/}
          {/*  onClick={(e) => {*/}
          {/*    e.stopPropagation();*/}
          {/*    e.preventDefault();*/}
          {/*    navigate(basePath + `/${channel}/${stepUuid}`);*/}
          {/*  }}*/}
          {/*>*/}
          {/*  <WorkflowNode*/}
          {/*    Icon={Icon}*/}
          {/*    label={steps[index].name}*/}
          {/*    subtitle={steps[index].template.content}*/}
          {/*    channelType={steps[index].type}*/}
          {/*  />*/}
          {/*</div>*/}
          {variants?.map((variant) => {
            return <VariantItemCard key={variant._id} variant={variant} />;
          })}
        </ScrollArea>
      </VariantsListSidebar>
    </>
  );
}
