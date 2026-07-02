import type { ChannelEndpointType } from '@novu/shared';
import type { ChannelEndpointPayload } from '@/api/channel-endpoints';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CopyButton } from '@/components/primitives/copy-button';
import { EditButton } from '@/components/primitives/edit-button';
import type {
  ChatCredentialItem,
  ChatIntegrationRow,
  CredentialRow as CredentialRowModel,
  EditableCredentialRow,
  OverviewField,
  ReadonlyCredentialRow,
} from './build-credential-groups';
import { ChatIntegrationCard } from './chat-integration-card';
import { PushIntegrationCard } from './push-integration-card';

const iconButtonClassName = 'p-0.5 hover:bg-transparent';

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
  const emptyLabel = row.overviewField === 'email' ? 'Email address not set' : 'Phone number not set';
  const displayValue = row.jsonKey ? JSON.stringify({ [row.jsonKey]: row.value }, null, 2) : row.value;

  return (
    <div className="bg-bg-weak flex w-full flex-col gap-1.5 rounded-lg p-1.5">
      {!row.hideProviderHeader && (
        <div className="flex min-h-7 items-center gap-1.5 px-0.5">
          <ProviderIcon providerId={row.providerId} providerDisplayName={row.displayName} className="size-5 shrink-0" />
          <span className="text-label-xs truncate font-medium text-text-strong">{row.displayName}</span>
        </div>
      )}

      {row.value ? (
        <div className="bg-bg-white flex items-start gap-1 rounded-md p-1.5 shadow-xs">
          {row.jsonKey ? (
            <pre className="text-paragraph-xs nv-no-scrollbar min-w-0 flex-1 overflow-x-auto font-mono text-text-sub">
              {displayValue}
            </pre>
          ) : (
            <span className="text-paragraph-xs min-w-0 flex-1 truncate font-mono tracking-[-0.2px] text-text-sub py-1">
              {displayValue}
            </span>
          )}
          <div className="flex shrink-0 items-center gap-1">
            <CopyButton valueToCopy={displayValue} size="2xs" className={iconButtonClassName} />
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
      ) : (
        <div className="border-stroke-soft bg-bg-white flex items-center gap-1 rounded border border-dashed px-2 py-2">
          <span className="text-[10px] leading-4 min-w-0 flex-1 text-text-soft">{emptyLabel}</span>
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
      )}
    </div>
  );
}

type CredentialRowProps = {
  row: CredentialRowModel;
  readOnly: boolean;
  actions: CredentialActions;
};

export function CredentialRow({ row, readOnly, actions }: CredentialRowProps) {
  if (row.kind === 'chatIntegration') {
    return (
      <ChatIntegrationCard
        row={row}
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
