import { motion } from 'motion/react';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { RiArrowLeftSLine, RiExpandUpDownLine } from 'react-icons/ri';
import { Navigate, useNavigate } from 'react-router-dom';
import { AgentPreviewFeatureList } from '@/components/onboarding/agent-preview-feature-list';
import { AgentUsecasePreviewIllustration } from '@/components/onboarding/agent-usecase-preview-illustration';
import { OnboardingContinueFooter } from '@/components/onboarding/onboarding-continue-footer';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { ChannelChip } from '@/components/onboarding/personalize/channel-chip';
import {
  AGENT_AUDIENCE_OPTIONS,
  AGENT_CHANNEL_OPTIONS,
  AGENT_READINESS_OPTIONS,
  type AgentAudience,
  type AgentReadiness,
  type PersonalizeOption,
} from '@/components/onboarding/personalize/personalize-options';
import { PageMeta } from '@/components/page-meta';
import { Label } from '@/components/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { useAreConversationalAgentsAvailable } from '@/hooks/use-are-conversational-agents-available';
import { useOnboardingProvisioningActive, useOnboardingProvisioningDismiss } from '@/hooks/use-onboarding-provisioning';
import { useTelemetry } from '@/hooks/use-telemetry';
import { beginOnboardingProvisioning } from '@/utils/connect/onboarding-session';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

const PAGE_TITLE = 'Help us personalize your experience';

/** Wraps each question so it rises into place as the previous answer reveals it. */
function RevealedField({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function QuestionSelect<TValue extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: PersonalizeOption<TValue>[];
  value: TValue | undefined;
  onChange: (value: TValue) => void;
}) {
  // The trigger is a button, not a form control, so the label has to be associated explicitly.
  const labelId = useId();

  return (
    <div className="flex max-w-[350px] flex-col gap-1.5">
      <Label id={labelId} className="text-text-sub cursor-default font-normal">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as TValue)}>
        <SelectTrigger
          size="2xs"
          aria-labelledby={labelId}
          rightIcon={<RiExpandUpDownLine className="text-text-soft size-4" />}
        >
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ChannelQuestion({ selected, onToggle }: { selected: string[]; onToggle: (value: string) => void }) {
  const labelId = useId();

  return (
    <fieldset aria-labelledby={labelId} className="flex flex-col gap-2 border-0 p-0">
      <Label id={labelId} className="text-text-sub cursor-default font-normal">
        Where do you want to connect your agent?
      </Label>
      <div className="flex max-w-[400px] flex-wrap gap-2">
        {AGENT_CHANNEL_OPTIONS.map((option) => (
          <ChannelChip
            key={option.value}
            label={option.label}
            icon={option.icon}
            accent={option.accent}
            isSelected={selected.includes(option.value)}
            onToggle={() => onToggle(option.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function AgentsPersonalizePage() {
  const areAgentsAvailable = useAreConversationalAgentsAvailable();
  const navigate = useNavigate();
  const telemetry = useTelemetry();
  const provisioningActive = useOnboardingProvisioningActive();

  const [readiness, setReadiness] = useState<AgentReadiness | undefined>(undefined);
  const [audience, setAudience] = useState<AgentAudience | undefined>(undefined);
  const [channels, setChannels] = useState<string[]>([]);

  // Clears any loader left running by a preceding step — this page has no data dependency.
  useOnboardingProvisioningDismiss({ isReady: true, fallbackVariant: 'agents' });

  useEffect(() => {
    telemetry(TelemetryEvent.ONBOARDING_PERSONALIZE_PAGE_VIEWED);
  }, [telemetry]);

  const handleReadinessChange = (value: AgentReadiness) => {
    setReadiness(value);
    telemetry(TelemetryEvent.ONBOARDING_PERSONALIZE_ANSWERED, { question: 'agent_readiness', value });
  };

  const handleAudienceChange = (value: AgentAudience) => {
    setAudience(value);
    telemetry(TelemetryEvent.ONBOARDING_PERSONALIZE_ANSWERED, { question: 'agent_audience', value });
  };

  const handleChannelToggle = (value: string) => {
    const isSelected = channels.includes(value);

    setChannels(isSelected ? channels.filter((item) => item !== value) : [...channels, value]);
    telemetry(TelemetryEvent.ONBOARDING_PERSONALIZE_ANSWERED, {
      question: 'agent_channels',
      value,
      selected: !isSelected,
    });
  };

  const handleContinue = () => {
    telemetry(TelemetryEvent.ONBOARDING_PERSONALIZE_SUBMITTED, {
      agentReadiness: readiness,
      agentAudience: audience,
      agentChannels: channels,
    });
    // The agents setup page waits on the org, so the loader plays across that hand-off.
    beginOnboardingProvisioning('agents');
    void navigate(ROUTES.AGENTS_SETUP);
  };

  if (!areAgentsAvailable) {
    return <Navigate to={ROUTES.INBOX_USECASE} replace />;
  }

  if (provisioningActive) {
    return null;
  }

  const leftContent = (
    <>
      <PageMeta title={PAGE_TITLE} />
      <button
        type="button"
        onClick={() => navigate(ROUTES.USECASE_SELECT)}
        className="mb-5 flex cursor-pointer items-center gap-0.5"
      >
        <RiArrowLeftSLine className="text-text-sub size-4" />
        <span className="text-text-sub text-xs">2/3</span>
      </button>

      <h1 className="text-foreground text-label-lg text-xl font-normal">{PAGE_TITLE}</h1>
      <p className="text-text-soft text-label-xs mt-2 max-w-[340px] font-normal">
        Tell us about the agent you want to connect and how it should reach users.
      </p>

      <div className="mt-6 flex max-w-[400px] flex-col gap-7">
        <QuestionSelect
          label="Do you already have an agent to connect?"
          options={AGENT_READINESS_OPTIONS}
          value={readiness}
          onChange={handleReadinessChange}
        />

        {readiness ? (
          <RevealedField>
            <QuestionSelect
              label="Who should your agent communicate with?"
              options={AGENT_AUDIENCE_OPTIONS}
              value={audience}
              onChange={handleAudienceChange}
            />
          </RevealedField>
        ) : null}

        {audience ? (
          <RevealedField>
            <ChannelQuestion selected={channels} onToggle={handleChannelToggle} />
          </RevealedField>
        ) : null}
      </div>

      {audience ? (
        <RevealedField>
          <OnboardingContinueFooter onContinue={handleContinue} />
        </RevealedField>
      ) : null}
    </>
  );

  const rightContent = (
    <div className="flex flex-col items-start">
      <div className="self-center">
        <AgentUsecasePreviewIllustration />
      </div>
      <div className="mt-10">
        <AgentPreviewFeatureList />
      </div>
    </div>
  );

  return <OnboardingShell left={leftContent} right={rightContent} />;
}
