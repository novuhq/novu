import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  render,
  Section,
  Text,
} from '@react-email/components';
import React from 'react';
import { ControlValueSchema, PayloadSchemaType } from './schemas';

interface ITopProvider {
  name: string;
  count: number;
  icon?: string;
}

interface ITopWorkflow {
  name: string;
  count: number;
}

interface IChannel {
  name: string;
  value: number;
  color: string;
  dashArray: string;
}

export interface IEmailProps {
  dateRange: string;
  messagesSent: number;
  messagesSentChange: number;
  messagesSentUp: boolean;
  usersReached: number;
  usersReachedChange: number;
  usersReachedUp: boolean;
  workflowRuns: number;
  userInteractions: number;
  interactionRate: number;
  topProviders: ITopProvider[];
  topWorkflows: ITopWorkflow[];
  channels: IChannel[];
  dashboardUrl: string;
  previewText?: string;
}

const NOVU_LOGO_URL = 'https://dashboard.novu.co/static/images/novu-colored-text.png';

const COLORS = {
  bg: '#f9fafb',
  white: '#ffffff',
  border: '#e5e7eb',
  borderSoft: 'rgba(0, 0, 0, 0.08)',
  primary: '#111827',
  secondary: '#4b5563',
  muted: '#6b7280',
  textSoft: '#99a0ae',
  cardText: '#333333',
  faint: '#9ca3af',
  dark: '#374151',
  success: '#1fc16b',
  successBg: 'rgba(31, 193, 103, 0.1)',
  error: '#ef4444',
  errorBg: '#fee2e2',
  warning: '#f59e0b',
  accent: '#dd2590',
} as const;

const cardStyle: React.CSSProperties = {
  backgroundColor: COLORS.white,
  borderRadius: '8px',
  border: `1px solid ${COLORS.borderSoft}`,
  padding: '12px',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.12px',
  textTransform: 'uppercase',
  color: COLORS.textSoft,
  margin: '0',
  fontFamily: "'JetBrains Mono', monospace",
};

const bigNumberStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 600,
  color: COLORS.cardText,
  margin: '0',
  lineHeight: '40px',
  fontFamily: "'Manrope', sans-serif",
  letterSpacing: '-0.192px',
};

const mediumNumberStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: COLORS.primary,
  lineHeight: '1.1',
  margin: '0',
};

const listCellStyle: React.CSSProperties = {
  padding: '6px 8px',
};

const listValueCellStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'right' as const,
  fontSize: '13px',
  fontWeight: 500,
  color: COLORS.primary,
};

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <Section style={{ ...cardStyle, ...style }}>{children}</Section>;
}

function NovuLogo() {
  return (
    <Section style={{ textAlign: 'center' as const, padding: '24px 0 32px' }}>
      <Img src={NOVU_LOGO_URL} alt="Novu" width={100} height={37} style={{ margin: '0 auto' }} />
    </Section>
  );
}

function RecapHeader({ dateRange }: { dateRange: string }) {
  return (
    <Card
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}
    >
      <Text
        style={{
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '1.4px',
          textTransform: 'uppercase' as const,
          color: '#646464',
          margin: '0',
          fontFamily: 'Manrope, sans-serif',
        }}
      >
        MONTHLY RECAP
      </Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' as const }}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          <path
            d="M17 3H21C21.2652 3 21.5196 3.10536 21.7071 3.29289C21.8946 3.48043 22 3.73478 22 4V20C22 20.2652 21.8946 20.5196 21.7071 20.7071C21.5196 20.8946 21.2652 21 21 21H3C2.73478 21 2.48043 20.8946 2.29289 20.7071C2.10536 20.5196 2 20.2652 2 20V4C2 3.73478 2.10536 3.48043 2.29289 3.29289C2.48043 3.10536 2.73478 3 3 3H7V1H9V3H15V1H17V3ZM20 9V5H17V7H15V5H9V7H7V5H4V9H20ZM20 11H4V19H20V11Z"
            fill="#646464"
          />
        </svg>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#646464',
            lineHeight: '16px',
            fontFamily: 'Manrope, sans-serif',
          }}
        >
          {dateRange}
        </span>
      </div>
    </Card>
  );
}

function ChangeBadge({ value, isUp }: { value: number; isUp: boolean }) {
  const arrowUpIcon = `data:image/svg+xml,%3Csvg width='11' height='6' viewBox='0 0 11 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10.3636 5.45455L5.45455 0.545454L0.545455 5.45455' stroke='%231fc16b' stroke-width='1.09091'/%3E%3C/svg%3E`;
  const arrowDownIcon = `data:image/svg+xml,%3Csvg width='11' height='6' viewBox='0 0 11 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0.545455 0.545454L5.45455 5.45455L10.3636 0.545454' stroke='%23ef4444' stroke-width='1.09091'/%3E%3C/svg%3E`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '10px',
        fontWeight: 500,
        color: isUp ? COLORS.success : COLORS.error,
        backgroundColor: isUp ? COLORS.successBg : COLORS.errorBg,
        padding: '2px 4px',
        borderRadius: '3px',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
    >
      <img
        src={isUp ? arrowUpIcon : arrowDownIcon}
        alt={isUp ? 'up' : 'down'}
        width="11"
        height="6"
        style={{ display: 'block' }}
      />
      {value}%
    </span>
  );
}

function StatCardWithChange({
  label,
  value,
  change,
  isUp,
}: {
  label: string;
  value: number;
  change: number;
  isUp: boolean;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <Text style={sectionLabelStyle}>{label}</Text>
        <ChangeBadge value={change} isUp={isUp} />
      </div>
      <Text style={bigNumberStyle}>{formatNumber(value)}</Text>
    </Card>
  );
}

function StatCardWithDetail({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: number;
  unit: string;
  detail: React.ReactNode;
}) {
  return (
    <Card>
      <Text style={sectionLabelStyle}>{label}</Text>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
        <span style={mediumNumberStyle}>{formatNumber(value)}</span>
        <span style={{ fontSize: '13px', color: COLORS.muted, textTransform: 'uppercase' as const, fontWeight: 500 }}>
          {unit}
        </span>
      </div>
      <Text style={{ fontSize: '13px', color: COLORS.muted, margin: '0', lineHeight: '1.5' }}>{detail}</Text>
    </Card>
  );
}

function RankedListCard({
  items,
  title,
  showWorkflowIcon = false,
}: {
  items: PayloadSchemaType['topProviders'];
  title: string;
  showWorkflowIcon?: boolean;
}) {
  const valueColor = COLORS.primary;

  return (
    <Card>
      <Text style={sectionLabelStyle}>{title}</Text>
      <table role="presentation" width="100%" style={{ marginTop: '12px' }}>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ ...listCellStyle, paddingTop: '8px', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {showWorkflowIcon && (
                    <span style={{ fontSize: '14px', color: COLORS.muted, minWidth: '20px' }}>⚡</span>
                  )}
                  {item.icon && <Img src={item.icon} alt="" width={16} height={16} style={{ borderRadius: '3px' }} />}
                  <span style={{ fontSize: '14px', color: COLORS.dark, fontWeight: 500 }}>{item.name}</span>
                </div>
              </td>
              <td style={{ ...listValueCellStyle, color: valueColor || COLORS.primary, fontSize: '14px' }}>
                {formatNumber(item.count)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function ChannelsSection({ channels }: { channels: PayloadSchemaType['channels'] }) {
  return (
    <Card style={{ marginBottom: '12px' }}>
      <Text style={sectionLabelStyle}>Delivery by Channels</Text>
      <table role="presentation" width="100%" style={{ marginTop: '12px' }}>
        <tbody>
          <tr>
            {channels.map((channel, idx) => (
              <td
                key={idx}
                style={{
                  textAlign: 'center' as const,
                  padding: '12px 8px',
                  borderRight: idx < channels.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                }}
              >
                <Text
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: channel.color,
                    margin: '0 0 4px',
                    lineHeight: '1.1',
                  }}
                >
                  {formatNumber(channel.value)}
                </Text>
                <Text
                  style={{
                    fontSize: '12px',
                    color: COLORS.muted,
                    textTransform: 'uppercase' as const,
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    margin: '0',
                  }}
                >
                  {channel.name}
                </Text>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

function FooterCta({ dashboardUrl }: { dashboardUrl: string }) {
  return (
    <Card
      style={{
        marginBottom: '24px',
        textAlign: 'center' as const,
        padding: '40px 24px',
      }}
    >
      <Text style={{ ...sectionLabelStyle, letterSpacing: '1.2px', fontSize: '12px', marginBottom: '12px' }}>
        That's the week
      </Text>
      <Text
        style={{
          fontSize: '15px',
          color: COLORS.secondary,
          margin: '0 0 24px',
          lineHeight: '1.6',
        }}
      >
        This message self-destructs in seven days.
        <br />
        (Kidding. It's an email.)
      </Text>
      <Button
        href={dashboardUrl}
        style={{
          backgroundColor: COLORS.accent,
          color: COLORS.white,
          fontSize: '14px',
          fontWeight: 600,
          padding: '12px 28px',
          borderRadius: '8px',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        View dashboard →
      </Button>
    </Card>
  );
}

function EmailFooter() {
  const footerTextStyle: React.CSSProperties = {
    fontSize: '11px',
    color: COLORS.faint,
    margin: '0 0 4px',
    lineHeight: '1.5',
  };

  const socialDotStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    backgroundColor: COLORS.faint,
    borderRadius: '50%',
    margin: '0 4px',
  };

  return (
    <Section style={{ textAlign: 'center' as const, padding: '24px 0' }}>
      <Text style={footerTextStyle}>Novu, Inc.,</Text>
      <Text style={footerTextStyle}>1209 Orange Street, Wilmington, DE 19801, United States</Text>
      <Text style={{ marginTop: '12px', marginBottom: '0' }}>
        <Link href="https://linkedin.com/company/novu" style={{ textDecoration: 'none' }}>
          <span style={socialDotStyle} />
        </Link>
        <Link href="https://youtube.com/@novu" style={{ textDecoration: 'none' }}>
          <span style={socialDotStyle} />
        </Link>
        <Link href="https://twitter.com/novuhq" style={{ textDecoration: 'none' }}>
          <span style={socialDotStyle} />
        </Link>
      </Text>
    </Section>
  );
}

export function UsageReportEmail({
  props,
}: {
  props: PayloadSchemaType & ControlValueSchema & { previewText?: string; showWorkflowIcon?: boolean };
}) {
  const {
    dateRange,
    messagesSent,
    messagesSentChange,
    messagesSentUp,
    usersReached,
    usersReachedChange,
    usersReachedUp,
    workflowRuns,
    userInteractions,
    interactionRate,
    topProviders,
    topWorkflows,
    channels,
    dashboardUrl,
    previewText = 'Your monthly Novu usage report',
  } = props;

  return (
    <Html lang="en">
      <Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${COLORS.bg}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
          table { border-spacing: 0; border-collapse: collapse; }
          td { padding: 0; }
          img { border: 0; display: block; }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: COLORS.bg, padding: '40px 20px' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: COLORS.bg }}>
          <NovuLogo />
          <RecapHeader dateRange={dateRange} />

          <Row style={{ marginBottom: '12px' }}>
            <Column style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
              <StatCardWithChange
                label="Messages Sent"
                value={messagesSent}
                change={messagesSentChange}
                isUp={messagesSentUp}
              />
            </Column>
            <Column style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
              <StatCardWithChange
                label="Users Reached"
                value={usersReached}
                change={usersReachedChange}
                isUp={usersReachedUp}
              />
            </Column>
          </Row>

          <Row style={{ marginBottom: '12px' }}>
            <Column style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
              <StatCardWithDetail
                label="Workflow Runs Triggered"
                value={workflowRuns}
                unit="workflow runs"
                detail={<>Total workflows executed during this period.</>}
              />
            </Column>
            <Column style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
              <StatCardWithDetail
                label="User Interactions"
                value={userInteractions}
                unit="interactions"
                detail={
                  <>
                    <span style={{ color: COLORS.success, fontWeight: 500 }}>{interactionRate}%</span> of all in-app
                    messages are interacted.
                  </>
                }
              />
            </Column>
          </Row>

          <Row style={{ marginBottom: '12px' }}>
            <Column style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
              <RankedListCard title="Top Delivery Providers" items={topProviders} />
            </Column>
            <Column style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
              <RankedListCard title="Top Workflows" items={topWorkflows} showWorkflowIcon />
            </Column>
          </Row>

          <ChannelsSection channels={channels} />

          <FooterCta dashboardUrl={dashboardUrl} />
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export type IRenderEmailPayload = Omit<IEmailProps, 'previewText'>;

export interface IEmailControls {
  previewText?: string;
}

// Default export for react-email dev server
// export default function Email() {
//   return (
//     <UsageReportEmail
//       dateRange="Feb 24, 2025 - Mar 24, 2025"
//       messagesSent={1234}
//       messagesSentChange={12.5}
//       messagesSentUp={true}
//       usersReached={567}
//       usersReachedChange={8.3}
//       usersReachedUp={true}
//       workflowRuns={890}
//       successRate={98.5}
//       userInteractions={234}
//       interactionRate={45.2}
//       topProviders={[
//         { name: 'SendGrid', count: 500, icon: 'https://via.placeholder.com/16' },
//         { name: 'Twilio', count: 300, icon: 'https://via.placeholder.com/16' },
//       ]}
//       topWorkflows={[
//         { name: 'Welcome Email', count: 200 },
//         { name: 'Password Reset', count: 150 },
//       ]}
//       channels={[
//         { name: 'Email', value: 800, color: '#3b82f6', dashArray: '0' },
//         { name: 'SMS', value: 200, color: '#10b981', dashArray: '0' },
//       ]}
//       dashboardUrl="https://dashboard.example.com"
//     />
//   );
// }

export default async function renderEmail(payload: PayloadSchemaType, controls: ControlValueSchema) {
  return await render(<UsageReportEmail props={{ ...payload, ...controls }} />);
}
