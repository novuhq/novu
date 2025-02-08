import { StepTypeEnum } from '@novu/shared';
import React from 'react';
import { RiAddFill } from 'react-icons/ri';
import { Card, CardContent } from '../primitives/card';
import { StepType } from '../step-preview-hover-card';
import { WorkflowStep } from '../workflow-step';

type WorkflowCardProps = {
  name: string;
  description: string;
  steps?: StepType[];
  onClick?: () => void;
};

export function WorkflowCard({
  name,
  description,
  steps = [StepTypeEnum.IN_APP, StepTypeEnum.EMAIL, StepTypeEnum.SMS, StepTypeEnum.PUSH],
  onClick,
}: WorkflowCardProps) {
  return (
    <Card
      className="border-stroke-soft min-h-[120px] min-w-[250px] border shadow-none hover:cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="overflow-hidden rounded-lg border border-neutral-100">
          <div className="bg-bg-weak relative h-[100px] bg-[url(/images/dots.svg)] bg-cover">
            <div className="flex h-full w-full items-center justify-center">
              {!steps?.length ? (
                <RiAddFill className="text-[#D6D6D6]" />
              ) : (
                steps.map((step, index) => (
                  <React.Fragment key={index}>
                    <WorkflowStep step={step} />
                    {index < steps.length - 1 && <div className="h-px w-6 bg-gray-200" />}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-label-sm text-text-strong mb-1">{name}</h3>
          <p className="text-paragraph-xs text-text-sub truncate">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
