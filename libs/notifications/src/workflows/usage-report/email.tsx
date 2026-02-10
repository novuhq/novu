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
  Section,
  Text,
} from '@react-email/components';
import { renderAsync } from '@react-email/render';
import React from 'react';

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
  successRate: number;
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
  primary: '#111827',
  secondary: '#4b5563',
  muted: '#6b7280',
  faint: '#9ca3af',
  dark: '#374151',
  success: '#10b981',
  successBg: '#d1fae5',
  error: '#ef4444',
  errorBg: '#fee2e2',
  warning: '#f59e0b',
  accent: '#dd2590',
} as const;

const cardStyle: React.CSSProperties = {
  backgroundColor: COLORS.white,
  borderRadius: '12px',
  border: `1px solid ${COLORS.border}`,
  padding: '16px',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: COLORS.muted,
  margin: '0 0 12px',
};

const bigNumberStyle: React.CSSProperties = {
  fontSize: '40px',
  fontWeight: 700,
  color: COLORS.primary,
  margin: '4px 0 0',
  lineHeight: '1.1',
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

function DecorativePattern() {
  const patternId = `decorative-grid-pattern-${Date.now()}`;

  return (
    <Section style={{ textAlign: 'center' as const, padding: '0', marginBottom: '16px' }}>
      <div
        style={{
          width: '100%',
          height: '120px',
          background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
          borderRadius: '12px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg
          width="100%"
          height="120"
          style={{ position: 'absolute', top: 0, left: 0, opacity: 0.4 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id={patternId} width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="none" stroke="#d4d4d8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="120" fill={`url(#${patternId})`} />
        </svg>
      </div>
    </Section>
  );
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
    <Section
      style={{
        ...cardStyle,
        background: 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)',
        padding: '16px 20px',
        marginBottom: '16px',
      }}
    >
      <Row>
        <Column style={{ verticalAlign: 'middle' }}>
          <Text style={{ ...sectionLabelStyle, letterSpacing: '1px', margin: '0', fontSize: '11px' }}>
            MONTHLY RECAP
          </Text>
        </Column>
        <Column style={{ textAlign: 'right' as const, verticalAlign: 'middle' }}>
          <Text style={{ fontSize: '12px', color: COLORS.muted, margin: '0', fontWeight: 500 }}>📅 {dateRange}</Text>
        </Column>
      </Row>
    </Section>
  );
}

function ChangeBadge({ value, isUp }: { value: number; isUp: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '12px',
        fontWeight: 600,
        color: isUp ? COLORS.success : COLORS.error,
        backgroundColor: isUp ? COLORS.successBg : COLORS.errorBg,
        padding: '4px 10px',
        borderRadius: '100px',
      }}
    >
      <span style={{ fontSize: '11px' }}>{isUp ? '↗' : '↘'}</span> {value}%
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
    <Section style={cardStyle}>
      <Row>
        <Column>
          <Text style={sectionLabelStyle}>{label}</Text>
        </Column>
        <Column style={{ textAlign: 'right' as const }}>
          <ChangeBadge value={change} isUp={isUp} />
        </Column>
      </Row>
      <Text style={bigNumberStyle}>{formatNumber(value)}</Text>
    </Section>
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
    <Section style={cardStyle}>
      <Text style={sectionLabelStyle}>{label}</Text>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
        <span style={mediumNumberStyle}>{formatNumber(value)}</span>
        <span style={{ fontSize: '13px', color: COLORS.muted, textTransform: 'uppercase' as const, fontWeight: 500 }}>
          {unit}
        </span>
      </div>
      <Text style={{ fontSize: '13px', color: COLORS.muted, margin: '0', lineHeight: '1.5' }}>{detail}</Text>
    </Section>
  );
}

function RankedListCard({
  title,
  items,
  valueColor,
  showWorkflowIcon,
}: {
  title: string;
  items: Array<{ icon?: string; name: string; count: number }>;
  valueColor?: string;
  showWorkflowIcon?: boolean;
}) {
  return (
    <Section style={cardStyle}>
      <Text style={sectionLabelStyle}>{title}</Text>
      <table role="presentation" width="100%" style={{ marginTop: '12px' }}>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ ...listCellStyle, paddingTop: '8px', paddingBottom: '8px' }}>
                <Row>
                  {showWorkflowIcon && (
                    <Column style={{ width: '20px', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '14px', color: COLORS.muted }}>⚡</span>
                    </Column>
                  )}
                  {item.icon && (
                    <Column style={{ width: '20px', verticalAlign: 'middle' }}>
                      <Img src={item.icon} alt="" width={16} height={16} style={{ borderRadius: '3px' }} />
                    </Column>
                  )}
                  <Column
                    style={{
                      paddingLeft: item.icon || showWorkflowIcon ? '10px' : '0',
                      fontSize: '14px',
                      color: COLORS.dark,
                      fontWeight: 500,
                    }}
                  >
                    {item.name}
                  </Column>
                </Row>
              </td>
              <td style={{ ...listValueCellStyle, color: valueColor || COLORS.primary, fontSize: '14px' }}>
                {formatNumber(item.count)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function ChannelsSection({ channels }: { channels: IChannel[] }) {
  return (
    <Section style={{ ...cardStyle, marginBottom: '12px' }}>
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
    </Section>
  );
}

function FooterCta({ dashboardUrl }: { dashboardUrl: string }) {
  return (
    <Section
      style={{
        ...cardStyle,
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
    </Section>
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
      <div style={{ marginTop: '12px' }}>
        <Link href="https://linkedin.com/company/novu" style={{ textDecoration: 'none' }}>
          <span style={socialDotStyle} />
        </Link>
        <Link href="https://youtube.com/@novu" style={{ textDecoration: 'none' }}>
          <span style={socialDotStyle} />
        </Link>
        <Link href="https://twitter.com/novuhq" style={{ textDecoration: 'none' }}>
          <span style={socialDotStyle} />
        </Link>
      </div>
    </Section>
  );
}

export function UsageReportEmail({
  dateRange,
  messagesSent,
  messagesSentChange,
  messagesSentUp,
  usersReached,
  usersReachedChange,
  usersReachedUp,
  workflowRuns,
  successRate,
  userInteractions,
  interactionRate,
  topProviders,
  topWorkflows,
  channels,
  dashboardUrl,
  previewText = 'Your monthly Novu usage report',
}: IEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${COLORS.bg}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
          table { border-spacing: 0; border-collapse: collapse; }
          td { padding: 0; }
          img { border: 0; display: block; }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: COLORS.bg, padding: '40px 20px' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: COLORS.bg }}>
          <DecorativePattern />
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
                detail={
                  <>
                    with <span style={{ color: COLORS.success, fontWeight: 500 }}>{successRate}%</span> success rate.
                  </>
                }
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

export async function renderUsageReportEmail(payload: IRenderEmailPayload, controls: IEmailControls) {
  return renderAsync(<UsageReportEmail {...payload} {...controls} />);
}
