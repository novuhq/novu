import { CredentialsKeyEnum } from '@novu/shared';
import { type Control, Controller } from 'react-hook-form';
import { Button } from '@/components/primitives/button';
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

/** Placeholder doc link for configuring the tool-webhook endpoint/credentials via API. */
const TOOL_WEBHOOK_DYNAMIC_DOCS_URL = 'https://docs.novu.co/platform/integrations/tool/webhook';

const HTTP_METHODS = ['POST', 'PUT', 'PATCH'] as const;

type RoutingMode = 'static' | 'dynamic';

function toRoutingMode(value: unknown): RoutingMode {
  return value === 'dynamic' ? 'dynamic' : 'static';
}

type ToolWebhookSettingsProps = {
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
};

/**
 * Static/Dynamic delivery settings for the tool-webhook provider (Figma: NV-8358).
 * Static routes to a single integration URL; dynamic routes per-subscriber via the API.
 * Request headers/body and the signing secret are shared across both modes — in dynamic
 * mode they act as fallback defaults, which is an intentional deviation from Figma.
 */
export function ToolWebhookSettings({ control, isReadOnly }: ToolWebhookSettingsProps) {
  return (
    <Controller
      control={control}
      name={`credentials.${CredentialsKeyEnum.RoutingMode}`}
      render={({ field: routingModeField }) => {
        const routingMode = toRoutingMode(routingModeField.value);

        return (
          <div className="flex flex-col gap-3">
            <SegmentedControl
              value={routingMode}
              onValueChange={(value) => {
                if (value === 'static' || value === 'dynamic') {
                  routingModeField.onChange(value);
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
              <StaticRoutingFields control={control} isReadOnly={isReadOnly} />
            ) : (
              <DynamicRoutingFields control={control} isReadOnly={isReadOnly} />
            )}
          </div>
        );
      }}
    />
  );
}

function StaticRoutingFields({ control, isReadOnly }: ToolWebhookSettingsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label>Endpoint URL</Label>
        <div className="flex gap-1">
          <Controller
            control={control}
            name={`credentials.${CredentialsKeyEnum.Method}`}
            render={({ field }) => (
              <Select value={field.value || 'POST'} onValueChange={field.onChange} disabled={isReadOnly}>
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
            )}
          />
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

function DynamicRoutingFields({ control, isReadOnly }: ToolWebhookSettingsProps) {
  return (
    <div className="flex flex-col gap-3">
      <InlineToast
        variant="tip"
        title="Dynamic routing:"
        description="The endpoint URL and credentials are set per subscriber via the API, not on this integration."
        ctaLabel="View docs"
        onCtaClick={() => window.open(TOOL_WEBHOOK_DYNAMIC_DOCS_URL, '_blank', 'noopener,noreferrer')}
      />

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

function SigningSecretField({ control, isReadOnly }: ToolWebhookSettingsProps) {
  return (
    <Controller
      control={control}
      name={`credentials.${CredentialsKeyEnum.SecretKey}`}
      render={({ field }) => (
        <div className="flex flex-col gap-1">
          <Label>
            Signing secret
            <LabelSub>(optional)</LabelSub>
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

/** Test connection is out of scope for this pass — shown disabled to match the Figma layout. */
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
