import { Handle, Node as FlowNode, NodeProps, Position } from '@xyflow/react';
import { StepTypeEnum } from '@novu/shared';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { STEP_TYPE_TO_ICON } from '../icons/utils';
import { AddStepMenu } from './add-step-menu';
import { Node, NodeBody, NodeHeader, NodeIcon, NodeName } from './base-node';

export type NodeType = FlowNode<Record<string, unknown>>;

const topHandleClasses = `data-[handlepos=top]:w-2 data-[handlepos=top]:h-2 data-[handlepos=top]:bg-transparent data-[handlepos=top]:rounded-none data-[handlepos=top]:before:absolute data-[handlepos=top]:before:top-0 data-[handlepos=top]:before:left-0 data-[handlepos=top]:before:w-full data-[handlepos=top]:before:h-full data-[handlepos=top]:before:bg-neutral-alpha-200 data-[handlepos=top]:before:rotate-45`;

const bottomHandleClasses = `data-[handlepos=bottom]:w-2 data-[handlepos=bottom]:h-2 data-[handlepos=bottom]:bg-transparent data-[handlepos=bottom]:rounded-none data-[handlepos=bottom]:before:absolute data-[handlepos=bottom]:before:bottom-0 data-[handlepos=bottom]:before:left-0 data-[handlepos=bottom]:before:w-full data-[handlepos=bottom]:before:h-full data-[handlepos=bottom]:before:bg-neutral-alpha-200 data-[handlepos=bottom]:before:rotate-45`;

const handleClassName = `${topHandleClasses} ${bottomHandleClasses}`;

export const TriggerNode = (_props: NodeProps) => {
  return (
    <Node>
      <NodeHeader type={StepTypeEnum.TRIGGER}>
        <NodeName>Workflow trigger</NodeName>
      </NodeHeader>
      <NodeBody>This step triggers this workflow asdf asdf asd fasdf asdf</NodeBody>
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );
};

export const EmailNode = (_props: NodeProps<NodeType>) => {
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.EMAIL];

  return (
    <Node>
      <NodeHeader type={StepTypeEnum.EMAIL}>
        <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.EMAIL]}>
          <Icon />
        </NodeIcon>
        <NodeName>Email step</NodeName>
      </NodeHeader>
      <NodeBody>You have been invited to the Novu party on "commentSnippet"</NodeBody>
      <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );
};

export const SmsNode = (_props: NodeProps<NodeType>) => {
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.SMS];

  return (
    <Node>
      <NodeHeader type={StepTypeEnum.SMS}>
        <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.SMS]}>
          <Icon />
        </NodeIcon>
        <NodeName>SMS step</NodeName>
      </NodeHeader>
      <NodeBody>You have been invited to the Novu party on "commentSnippet"</NodeBody>
      <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );
};

export const InAppNode = (_props: NodeProps<NodeType>) => {
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP];

  return (
    <Node>
      <NodeHeader type={StepTypeEnum.IN_APP}>
        <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.IN_APP]}>
          <Icon />
        </NodeIcon>
        <NodeName>In-app step</NodeName>
      </NodeHeader>
      <NodeBody>You have been invited to the Novu party on "commentSnippet"</NodeBody>
      <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );
};

export const PushNode = (_props: NodeProps<NodeType>) => {
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.PUSH];

  return (
    <Node>
      <NodeHeader type={StepTypeEnum.PUSH}>
        <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.PUSH]}>
          <Icon />
        </NodeIcon>
        <NodeName>Push step</NodeName>
      </NodeHeader>
      <NodeBody>You have been invited to the Novu party on "commentSnippet"</NodeBody>
      <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );
};

export const ChatNode = (_props: NodeProps<NodeType>) => {
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.CHAT];

  return (
    <Node>
      <NodeHeader type={StepTypeEnum.CHAT}>
        <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.CHAT]}>
          <Icon />
        </NodeIcon>
        <NodeName>Chat step</NodeName>
      </NodeHeader>
      <NodeBody>You have been invited to the Novu party on "commentSnippet"</NodeBody>
      <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );
};

export const DelayNode = (_props: NodeProps<NodeType>) => {
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.DELAY];

  return (
    <Node>
      <NodeHeader type={StepTypeEnum.DELAY}>
        <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.DELAY]}>
          <Icon />
        </NodeIcon>
        <NodeName>Delay step</NodeName>
      </NodeHeader>
      <NodeBody>You have been invited to the Novu party on "commentSnippet"</NodeBody>
      <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );
};

export const DigestNode = (_props: NodeProps<NodeType>) => {
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.DIGEST];

  return (
    <Node>
      <NodeHeader type={StepTypeEnum.DIGEST}>
        <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.DIGEST]}>
          <Icon />
        </NodeIcon>
        <NodeName>Digest step</NodeName>
      </NodeHeader>
      <NodeBody>You have been invited to the Novu party on "commentSnippet"</NodeBody>
      <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );
};

export const CustomNode = (_props: NodeProps<NodeType>) => {
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.CUSTOM];

  return (
    <Node>
      <NodeHeader type={StepTypeEnum.CUSTOM}>
        <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.CUSTOM]}>
          <Icon />
        </NodeIcon>
        <NodeName>Custom step</NodeName>
      </NodeHeader>
      <NodeBody>You have been invited to the Novu party on "commentSnippet"</NodeBody>
      <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );
};

export const AddNode = (_props: NodeProps) => {
  return (
    <div className="flex w-[300px] justify-center">
      <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
      <AddStepMenu visible />
    </div>
  );
};
