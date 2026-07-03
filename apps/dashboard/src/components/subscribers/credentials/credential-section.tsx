import type { ChannelGroup } from './build-credential-groups';
import { type CredentialActions, CredentialRow } from './credential-row';

type CredentialSectionProps = {
  group: ChannelGroup;
  subscriberId: string;
  readOnly: boolean;
  actions: CredentialActions;
};

export function CredentialSection({ group, subscriberId, readOnly, actions }: CredentialSectionProps) {
  return (
    <section className="flex flex-col gap-1 p-2.5">
      <div className="flex h-6 items-center justify-between -mx-2.5 px-2.5 py-1 bg-bg-weak">
        <span className="text-subheading-2xs uppercase text-text-soft">{group.label}</span>
      </div>
      {group.rows.length > 0 ? (
        <div className="flex flex-col gap-2">
          {group.rows.map((row) => (
            <CredentialRow key={row.id} row={row} subscriberId={subscriberId} readOnly={readOnly} actions={actions} />
          ))}
        </div>
      ) : (
        <span className="text-label-xs py-2.5 text-text-soft">No credentials stored</span>
      )}
    </section>
  );
}
