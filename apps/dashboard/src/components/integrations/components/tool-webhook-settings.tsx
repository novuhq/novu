import { CredentialsKeyEnum } from '@novu/shared';
import { useEffect } from 'react';
import { type Control, Controller, type UseFormSetValue, useWatch } from 'react-hook-form';
import { Button } from '@/components/primitives/button';
import { HelpTooltipIndicator } from '@/components/primitives/help-tooltip-indicator';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Input } from '@/components/primitives/input';
import { Label, LabelSub } from '@/components/primitives/label';
import { SecretInput } from '@/components/primitives/secret-input';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import type { IntegrationFormData } from '../types';
import { ToolWebhookKeyValueField } from './tool-webhook-key-value-field';

const TOOL_WEBHOOK_DYNAMIC_DOCS_URL = 'https://docs.novu.co/platform/integrations/tool/webhook';

const HTTP_METHODS = ['POST', 'PUT', 'PATCH'] as const;
const DEFAULT_METHOD = 'POST';

type RoutingMode = 'static' | 'dynamic';
const DEFAULT_ROUTING_MODE: RoutingMode = 'static';

function toRoutingMode(value: unknown): RoutingMode {
  return value === 'dynamic' ? 'dynamic' : DEFAULT_ROUTING_MODE;
}

type ToolWebhookSettingsProps = {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  isReadOnly?: boolean;
};

export function ToolWebhookSettings({ control, setValue, isReadOnly }: ToolWebhookSettingsProps) {
  const routingModeValue = useWatch({ control, name: `credentials.${CredentialsKeyEnum.RoutingMode}` });
  const routingMode = toRoutingMode(routingModeValue);

  // A brand-new integration has no stored routingMode yet. The segmented control still
  // displays "Static" (the sensible default), so persist it on mount — otherwise a user
  // who never touches the control would save an integration with routingMode left unset.
  useEffect(() => {
    if (!routingModeValue) {
      setValue(`credentials.${CredentialsKeyEnum.RoutingMode}`, DEFAULT_ROUTING_MODE);
    }
  }, [routingModeValue, setValue]);

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        value={routingMode}
        onValueChange={(value) => {
          if (value === 'static' || value === 'dynamic') {
            setValue(`credentials.${CredentialsKeyEnum.RoutingMode}`, value);
          }
        }}
      >
        <SegmentedControlList className="w-fit min-w-[180px]">
          <SegmentedControlTrigger value="static" disabled={isReadOnly}>
            Static
          </SegmentedControlTrigger>
          <SegmentedControlTrigger value="dynamic" disabled={isReadOnly}>
            Dynamic
          </SegmentedControlTrigger>
        </SegmentedControlList>
      </SegmentedControl>

      {routingMode === 'static' ? (
        <StaticRoutingFields control={control} setValue={setValue} isReadOnly={isReadOnly} />
      ) : (
        <DynamicRoutingFields control={control} setValue={setValue} isReadOnly={isReadOnly} />
      )}
    </div>
  );
}

function StaticRoutingFields({ control, setValue, isReadOnly }: ToolWebhookSettingsProps) {
  const methodValue = useWatch({ control, name: `credentials.${CredentialsKeyEnum.Method}` });

  // Same rationale as the routing-mode default above: the select displays "POST" for a
  // fresh integration, so persist it rather than leaving the field unset until touched.
  useEffect(() => {
    if (!methodValue) {
      setValue(`credentials.${CredentialsKeyEnum.Method}`, DEFAULT_METHOD);
    }
  }, [methodValue, setValue]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label>Endpoint URL</Label>
        <div className="flex gap-1">
          <Select
            value={methodValue || DEFAULT_METHOD}
            onValueChange={(value) => setValue(`credentials.${CredentialsKeyEnum.Method}`, value)}
            disabled={isReadOnly}
          >
            <SelectTrigger className="w-[92px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Controller
            control={control}
            name={`credentials.${CredentialsKeyEnum.WebhookUrl}`}
            render={({ field }) => (
              <Input
                className="min-w-0 flex-1"
                placeholder="https://example.com/webhook"
                value={field.value ?? ''}
                disabled={isReadOnly}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>
      </div>

      <ToolWebhookKeyValueField
        control={control}
        name={`credentials.${CredentialsKeyEnum.Headers}`}
        label="Request headers"
        addLabel="Add header"
        isReadOnly={isReadOnly}
      />

      <ToolWebhookKeyValueField
        control={control}
        name={`credentials.${CredentialsKeyEnum.Body}`}
        label="Request body"
        addLabel="Add field"
        isReadOnly={isReadOnly}
      />

      <SigningSecretField control={control} isReadOnly={isReadOnly} />

      <TestConnectionPlaceholder />
    </div>
  );
}

function DynamicRoutingFields({ control, setValue, isReadOnly }: ToolWebhookSettingsProps) {
  const methodValue = useWatch({ control, name: `credentials.${CredentialsKeyEnum.Method}` });

  // Same rationale as static: the select displays "POST" for a fresh integration,
  // so persist it rather than leaving the field unset until touched.
  useEffect(() => {
    if (!methodValue) {
      setValue(`credentials.${CredentialsKeyEnum.Method}`, DEFAULT_METHOD);
    }
  }, [methodValue, setValue]);

  return (
    <div className="flex flex-col gap-3">
      <InlineToast
        variant="tip"
        title="Dynamic routing:"
        description="The endpoint URL and credentials are set per subscriber via the API, not on this integration."
        ctaLabel="View docs"
        onCtaClick={() => window.open(TOOL_WEBHOOK_DYNAMIC_DOCS_URL, '_blank', 'noopener,noreferrer')}
      />

      <div className="flex flex-col gap-1">
        <Label>Default HTTP method</Label>
        <Select
          value={methodValue || DEFAULT_METHOD}
          onValueChange={(value) => setValue(`credentials.${CredentialsKeyEnum.Method}`, value)}
          disabled={isReadOnly}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HTTP_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ToolWebhookKeyValueField
        control={control}
        name={`credentials.${CredentialsKeyEnum.Headers}`}
        label="Default request headers"
        addLabel="Add header"
        isReadOnly={isReadOnly}
      />

      <ToolWebhookKeyValueField
        control={control}
        name={`credentials.${CredentialsKeyEnum.Body}`}
        label="Default request body"
        addLabel="Add field"
        isReadOnly={isReadOnly}
      />

      <SigningSecretField control={control} isReadOnly={isReadOnly} />
    </div>
  );
}

function SigningSecretField({ control, isReadOnly }: Pick<ToolWebhookSettingsProps, 'control' | 'isReadOnly'>) {
  return (
    <Controller
      control={control}
      name={`credentials.${CredentialsKeyEnum.SecretKey}`}
      render={({ field }) => (
        <div className="flex flex-col gap-1">
          <Label className="inline-flex items-center gap-1">
            Signing secret
            <LabelSub>(optional)</LabelSub>
            <HelpTooltipIndicator text="Used to HMAC-sign outbound webhook requests. When set, Novu sends an X-Novu-Signature header so your endpoint can verify that the payload came from Novu." />
          </Label>
          <SecretInput
            placeholder="Enter signing secret"
            value={field.value ?? ''}
            disabled={isReadOnly}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        </div>
      )}
    />
  );
}

function TestConnectionPlaceholder() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="w-fit">
          <Button type="button" variant="secondary" mode="outline" size="xs" disabled className="pointer-events-none">
            Test connection
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Coming soon</TooltipContent>
    </Tooltip>
  );
}
