import { useMemo } from 'react';
import { ScrollArea } from '@mantine/core';
import { StepTypeEnum } from '@novu/shared';
import { useFormContext, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import { SubPageWrapper } from './SubPageWrapper';
import { WorkflowNode } from '../workflow/workflow/node-types/WorkflowNode';
import { stepIcon } from '../constants';
import { useBasePath } from '../hooks/useBasePath';
import { StepName } from './StepName';

export function VariantsPage() {
  const { control, watch } = useFormContext();
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum | undefined;
    stepUuid: string;
  }>();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const steps = watch('steps');

  const index = useMemo(
    () => steps.findIndex((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );
  const variants = useWatch({ control, name: `steps.${index}.variants` });
  if (!channel) {
    return null;
  }

  const Icon = stepIcon[channel];

  return (
    <>
      <SubPageWrapper
        title={<StepName channel={channel} index={index} />}
        root={true}
        style={{
          display: 'flex',
          flexFlow: 'column',
        }}
      >
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
            return (
              <div
                key={variant._id}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  navigate(basePath + `/${channel}/${stepUuid}/variants/${variant.uuid}`);
                }}
              >
                <WorkflowNode
                  Icon={Icon}
                  label={variant.name}
                  subtitle={variant.template?.content}
                  channelType={variant.type}
                />
              </div>
            );
          })}
        </ScrollArea>
      </SubPageWrapper>
    </>
  );
}
