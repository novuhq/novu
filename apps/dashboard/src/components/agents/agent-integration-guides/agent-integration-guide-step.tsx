type AgentIntegrationGuideStepProps = {
  step: number;
  title: string;
  description: string;
};

export function AgentIntegrationGuideStep({ step, title, description }: AgentIntegrationGuideStepProps) {
  return (
    <div className="border-stroke-soft flex gap-3 rounded-lg border p-4">
      <span className="bg-bg-soft text-text-sub flex size-7 shrink-0 items-center justify-center rounded-md font-mono text-label-xs">
        {step}
      </span>
      <div className="min-w-0">
        <p className="text-text-strong text-label-sm font-medium leading-5">{title}</p>
        <p className="text-text-soft text-label-sm mt-1 leading-5">{description}</p>
      </div>
    </div>
  );
}
