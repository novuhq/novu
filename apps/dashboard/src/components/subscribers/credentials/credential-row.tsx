import type { ChannelEndpointType } from '@novu/shared';
import { useState } from 'react';
import type { ChannelEndpointPayload } from '@/api/channel-endpoints';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CopyButton } from '@/components/primitives/copy-button';
import { EditButton } from '@/components/primitives/edit-button';
import { cn } from '@/utils/ui';
import type {
  ChatCredentialItem,
  ChatIntegrationRow,
  CredentialRow as CredentialRowModel,
  EditableCredentialRow,
  OverviewField,
  ReadonlyCredentialRow,
} from './build-credential-groups';
import { ChatIntegrationCard } from './chat-integration-card';
import {
  CREDENTIAL_CARD_CLASS,
  CREDENTIAL_FIELD_BOX_CLASS,
  CREDENTIAL_FIELD_LABEL_CLASS,
  CREDENTIAL_HOVER_ACTIONS_CLASS,
} from './credential-fields';
import { CredentialVisibilityToggle } from './credential-visibility-toggle';
import { maskCredentialValue } from './mask-credential-value';
import { PushIntegrationCard } from './push-integration-card';

const iconButtonClassName = 'p-0.5 hover:bg-transparent';

function getOverviewFieldLabel(overviewField: OverviewField): string {
  if (overviewField === 'email') {
    return 'Email';
  }

  return 'Phone number';
}

export type CredentialActions = {
  onSaveItem: (item: ChatCredentialItem, payload: ChannelEndpointPayload) => Promise<boolean>;
  onDeleteItem: (item: ChatCredentialItem) => void;
  onAddItem: (row: ChatIntegrationRow, type: ChannelEndpointType, payload: ChannelEndpointPayload) => Promise<boolean>;
  onSaveToken: (row: EditableCredentialRow, value: string, mode: 'add' | 'edit', index?: number) => Promise<boolean>;
  onDeleteToken: (row: EditableCredentialRow, index: number) => void;
  onEditInOverview: (field: OverviewField) => void;
};

function ReadonlyCard({
  row,
  readOnly,
  onEditInOverview,
}: {
  row: ReadonlyCredentialRow;
  readOnly: boolean;
  onEditInOverview: (field: OverviewField) => void;
}) {
  const [valuesVisible, setValuesVisible] = useState(false);
  const emptyLabel = row.overviewField === 'email' ? 'Email address not set' : 'Phone number not set';
  const fieldLabel = getOverviewFieldLabel(row.overviewField);
  const displayValue = valuesVisible || !row.value ? row.value : maskCredentialValue(row.value);
  const actionPaddingClass = row.hideProviderHeader ? 'pr-16' : 'pr-7';

  return (
    <div className="bg-bg-weak flex w-full flex-col gap-1.5 rounded-lg p-1.5">
      {!row.hideProviderHeader && (
        <div className="flex min-h-7 items-center gap-1.5 px-0.5">
          <ProviderIcon providerId={row.providerId} providerDisplayName={row.displayName} className="size-5 shrink-0" />
          <span className="text-label-xs truncate font-medium text-text-strong">{row.displayName}</span>
          {row.value && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <CredentialVisibilityToggle
                visible={valuesVisible}
                ariaLabel={`${row.displayName} credentials`}
                onToggle={() => setValuesVisible((prev) => !prev)}
              />
            </div>
          )}
        </div>
      )}

      {row.value ? (
        <div className={CREDENTIAL_CARD_CLASS}>
          <div className="flex min-w-0 flex-col gap-1">
            <span className={CREDENTIAL_FIELD_LABEL_CLASS}>{fieldLabel}</span>
            <div className={`relative ${CREDENTIAL_FIELD_BOX_CLASS}`}>
              <span className={`min-w-0 flex-1 truncate ${actionPaddingClass}`}>{displayValue}</span>
              <div
                className={cn(
                  'absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1',
                  CREDENTIAL_HOVER_ACTIONS_CLASS
                )}
              >
                {row.hideProviderHeader && (
                  <CredentialVisibilityToggle
                    visible={valuesVisible}
                    ariaLabel={`${row.displayName} credentials`}
                    onToggle={() => setValuesVisible((prev) => !prev)}
                  />
                )}
                <CopyButton
                  valueToCopy={row.value}
                  size="2xs"
                  className={iconButtonClassName}
                  ariaLabel={`Copy ${fieldLabel}`}
                />
                {!readOnly && (
                  <EditButton
                    size="2xs"
                    className={iconButtonClassName}
                    tooltip="Edit in overview"
                    aria-label={`Edit ${row.overviewField} in Overview`}
                    onClick={() => onEditInOverview(row.overviewField)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="group/credential border-stroke-soft bg-bg-white flex items-center gap-1 rounded border border-dashed px-2 py-2">
          <span className="text-[10px] leading-4 min-w-0 flex-1 text-text-soft">{emptyLabel}</span>
          {!readOnly && (
            <EditButton
              size="2xs"
              className={cn(iconButtonClassName, CREDENTIAL_HOVER_ACTIONS_CLASS)}
              tooltip="Edit in overview"
              aria-label={`Edit ${row.overviewField} in Overview`}
              onClick={() => onEditInOverview(row.overviewField)}
            />
          )}
        </div>
      )}
    </div>
  );
}

type CredentialRowProps = {
  row: CredentialRowModel;
  subscriberId: string;
  readOnly: boolean;
  actions: CredentialActions;
};

export function CredentialRow({ row, subscriberId, readOnly, actions }: CredentialRowProps) {
  if (row.kind === 'chatIntegration') {
    return (
      <ChatIntegrationCard
        row={row}
        subscriberId={subscriberId}
        readOnly={readOnly}
        onSaveItem={actions.onSaveItem}
        onDeleteItem={actions.onDeleteItem}
        onAddItem={actions.onAddItem}
      />
    );
  }

  if (row.kind === 'readonly') {
    return <ReadonlyCard row={row} readOnly={readOnly} onEditInOverview={actions.onEditInOverview} />;
  }

  return (
    <PushIntegrationCard
      row={row}
      readOnly={readOnly}
      onSaveToken={actions.onSaveToken}
      onDeleteToken={actions.onDeleteToken}
    />
  );
}
