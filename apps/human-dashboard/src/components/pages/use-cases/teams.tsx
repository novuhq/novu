import Image from 'next/image';

import { LandingHeading } from '@/components/pages/channels/shared';
import { SectionFrame } from '@/components/sapien/section-frame';
import { SECURITY_BADGES } from '@/data/sapien-scale';

const teams = [
  {
    name: 'Engineering',
    icon: 'terminal',
    description: 'Coding agents ask before a migration, and you hand them tasks from Slack or your phone.',
    tags: ['approve', 'listen'],
  },
  {
    name: 'Support',
    icon: 'support',
    description: 'Refunds over your limit go to the team lead, who approves in one click.',
    tags: ['approve'],
  },
  {
    name: 'Operations',
    icon: 'bell',
    description: "Incidents reach whoever's on call, with the options already laid out.",
    tags: ['choose'],
  },
  {
    name: 'Finance',
    icon: 'article',
    description: 'Invoices and purchases wait for sign-off before the agent pays.',
    tags: ['approve'],
  },
  {
    name: 'Recruiting',
    icon: 'invite',
    description: 'The agent asks the hiring manager to pick interview slots, and follows up until they do.',
    tags: ['choose', 'ask'],
  },
  {
    name: 'Personal',
    icon: 'conversation',
    description: 'Your assistant books, buys and replies, and checks with you first.',
    tags: ['choose', 'approve'],
  },
];

const guardrails = [
  {
    title: 'Contacts and strangers.',
    icon: 'contacts',
    text: "Every message is marked as coming from a contact or a stranger. A stranger's text is information, never instructions.",
  },
  {
    title: 'You choose who answers.',
    icon: 'invite',
    text: 'Approvals go to the contacts you name, and every answer records who gave it.',
  },
  {
    title: 'No cold messages.',
    icon: 'replies',
    text: "Your agent can reply to strangers but never message one first. Switch to contacts only and strangers' messages never arrive.",
  },
];

export function UseCaseTeams() {
  return (
    <SectionFrame anchor="by-team" className="border-t border-sapien-border px-4 pt-18 pb-8 md:px-8 md:pt-24">
      <LandingHeading
        lead="Anywhere work"
        accent="needs a person"
        description="The same three channels fit very different teams."
        descriptionClassName="max-w-none md:mb-1 md:w-auto md:pr-4"
      />
      <div className="mt-10 overflow-hidden rounded-xl border border-sapien-border md:mt-14">
        <table className="w-full table-fixed text-left">
          <caption className="sr-only">How teams use Agent Inbox</caption>
          <colgroup>
            <col className="w-[35%] sm:w-[36%]" />
            <col />
          </colgroup>
          <tbody className="divide-y divide-sapien-border">
            {teams.map(({ name, icon, description, tags }) => (
              <tr key={name}>
                <th
                  scope="row"
                  className="py-4 pr-2 pl-3 align-top text-sm font-normal leading-[1.35] tracking-tight sm:py-6 sm:pl-5 sm:text-lg"
                >
                  <span className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                    <UseCaseIcon name={icon} />
                    {name}
                  </span>
                </th>
                <td className="py-4 pr-3 pl-1.5 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/60 sm:p-6">
                  {description}
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-md border border-sapien-surface px-2 py-1.5 font-sapien-mono text-[11px] leading-none text-accent"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionFrame>
  );
}

export function UseCaseGuardrails() {
  return (
    <SectionFrame anchor="guardrails">
      <div className="px-4 py-12 md:px-8 md:py-14">
        <LandingHeading lead="An open inbox," accent="with guardrails" />
        <p className="mt-4 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/60">
          Anyone can message an agent with an address. Here&apos;s what keeps that safe.
        </p>
      </div>
      <ul className="grid divide-y divide-sapien-border border-t border-sapien-border md:grid-cols-3 md:divide-x md:divide-y-0">
        {guardrails.map(({ title, icon, text }) => (
          <li key={title} className="flex flex-col gap-6 px-5 py-7 md:gap-8 md:px-6 md:pt-6 md:pb-10">
            <UseCaseIcon name={icon} />
            <p className="text-lg leading-6 tracking-tight text-sapien-foreground/60">
              <strong className="font-normal text-sapien-foreground">{title}</strong> {text}
            </p>
          </li>
        ))}
      </ul>
      <div className="grid border-t border-sapien-border md:grid-cols-2">
        <ul className="grid grid-cols-4 divide-x divide-sapien-border">
          {SECURITY_BADGES.map(({ id, alt, image }) => (
            <li key={id} className="grid place-items-center px-1.5 py-8 sm:px-3">
              <Image
                src={image.src}
                alt={alt}
                width={image.width}
                height={image.height}
                className="h-auto max-w-full md:max-w-18"
                unoptimized
              />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-6 border-t border-sapien-border px-5 py-8 md:gap-8 md:border-t-0 md:border-l md:px-8 md:py-10">
          <UseCaseIcon name="shield" />
          <p className="text-lg leading-6 tracking-tight text-sapien-foreground/60">
            <strong className="font-normal text-sapien-foreground">Compliance.</strong> Built by the Novu team and
            covered by Novu&apos;s SOC 2 Type II, ISO 27001, GDPR and HIPAA compliance.
          </p>
        </div>
      </div>
    </SectionFrame>
  );
}

function UseCaseIcon({ name }: { name: string }) {
  return <Image src={`/images/use-cases/${name}.svg`} width={24} height={24} alt="" unoptimized />;
}
