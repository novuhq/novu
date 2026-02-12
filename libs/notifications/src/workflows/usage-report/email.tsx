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
} from '@react-email/components';
import React from 'react';

const defaultDetailValueStyle: React.CSSProperties = {
  color: '#525866',
  fontWeight: 600,
};

export interface DetailTextWithValueProps {
  value: string | number;
  prefix?: string;
  suffix?: string;
  valueStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

export const detailTextStyle: React.CSSProperties = {
  color: 'var(--text-soft, #99A0AE)',
  fontFeatureSettings: '"ss11" on, "cv09" on, "liga" off, "calt" off',
  fontFamily: 'Manrope, sans-serif',
  fontSize: '12px',
  fontStyle: 'normal',
  fontWeight: 600,
  lineHeight: 'normal',
  margin: 0,
};

export function DetailTextWithValue({ value, prefix = '', suffix = '', valueStyle, style }: DetailTextWithValueProps) {
  const valueStyles = { ...defaultDetailValueStyle, ...valueStyle };
  return (
    <span style={{ ...detailTextStyle, ...style }}>
      {prefix ? <span style={detailTextStyle}>{prefix}</span> : null}
      <span style={valueStyles}>{value}</span>
      {suffix ? <span style={detailTextStyle}>{suffix}</span> : null}
    </span>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '12px',
};

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card({ children, style }: CardProps) {
  return <Section style={{ ...cardStyle, ...style }}>{children}</Section>;
}

const defaultStyle: React.CSSProperties = {
  fontSize: '12px',
  margin: 0,
  padding: 0,
};

interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Text({ style, children, ...props }: TextProps) {
  return (
    <span {...props} style={{ ...defaultStyle, ...style }}>
      {children}
    </span>
  );
}

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

const NOVU_LOGO_URL = 'https://dashboard.novu.co/static/images/novu-logo-dark.svg';
const EMAIL_ICONS_BASE_URL = 'https://dashboard.novu.co/static/images';

const COLORS = {
  bg: '#f9fafb',
  white: '#ffffff',
  listBg: '#FBFBFB',
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

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.12px',
  textTransform: 'uppercase',
  color: COLORS.textSoft,
  margin: '0',
  fontFamily: "'JetBrains Mono', monospace",
};

const mediumNumberStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: COLORS.primary,
  lineHeight: '1.1',
  margin: '0',
  fontFamily: "'Manrope', sans-serif",
};

const listValueCellStyle: React.CSSProperties = {
  textAlign: 'right' as const,
  fontSize: '12px',
  fontWeight: 500,
  color: COLORS.primary,
};

/**
 * Maps provider names to their icon URLs on the Novu CDN.
 * Provider icons are hosted at: https://cdn.novu.co/images/providers/light/square/{provider-name}.svg
 */
function getProviderIconUrl(providerName: string): string {
  const normalizedName = providerName.toLowerCase().replace(/\s+/g, '-');

  return `${EMAIL_ICONS_BASE_URL}/${normalizedName}.svg`;
}

/**
 * Formats a number with locale-aware thousands separators.
 * @example formatNumber(1500000) // "1,500,000"
 */
function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatCompact(value: number): string {
  if (value < 1000) return String(Math.round(value));
  if (value < 1e6) {
    const k = Math.round(value / 1000);
    return k >= 1000 ? '1m' : k + 'k';
  }
  if (value < 1e9) {
    const m = Math.round(value / 1e6);
    return m >= 1000 ? '1b' : m + 'm';
  }
  if (value < 1e12) {
    const b = Math.round(value / 1e9);
    return b >= 1000 ? '1t' : b + 'b';
  }
  return Math.round(value / 1e12) + 't';
}

function NovuLogo() {
  return (
    <Section style={{ textAlign: 'center', padding: '24px 0 32px' }}>
      <Img src={NOVU_LOGO_URL} alt="Novu" width={100} height={37} style={{ margin: '0 auto' }} />
    </Section>
  );
}

function RecapHeader({ dateRange }: { dateRange: string }) {
  return (
    <Card style={{ marginBottom: '16px' }}>
      <Row>
        <Column>
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
        </Column>
        <Column align="right" style={{ width: '1%' }}>
          <Row style={{ margin: '0 0 0 auto' }}>
            <Column
              style={{
                lineHeight: '1',
                paddingRight: '4px',
                verticalAlign: 'middle',
              }}
            >
              <img
                src={`${EMAIL_ICONS_BASE_URL}/report-emails/calendar.svg`}
                alt=""
                width="14"
                height="14"
                style={{ display: 'block', width: '14px', height: '14px' }}
              />
            </Column>
            <Column
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#646464',
                lineHeight: '16px',
                fontFamily: 'Manrope, sans-serif',
                whiteSpace: 'nowrap' as const,
              }}
            >
              {dateRange}
            </Column>
          </Row>
        </Column>
      </Row>
    </Card>
  );
}

function ChangeBadge({ value, isUp }: { value: number; isUp: boolean }) {
  const iconUrl = isUp
    ? `${EMAIL_ICONS_BASE_URL}/report-emails/trend-up.svg`
    : `${EMAIL_ICONS_BASE_URL}/report-emails/trend-down.svg`;

  return (
    <table
      role="presentation"
      cellPadding="0"
      cellSpacing="0"
      style={{
        display: 'inline-table',
        borderCollapse: 'collapse',
        backgroundColor: isUp ? 'rgba(31, 193, 103, 0.1)' : COLORS.errorBg,
        borderRadius: '3px',
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: '2px 4px 2px 4px', verticalAlign: 'middle' }}>
            <img
              src={iconUrl}
              alt={isUp ? 'up' : 'down'}
              width="16"
              height="16"
              style={{ display: 'block', width: '16px', height: '16px' }}
            />
          </td>
          <td
            style={{
              padding: '2px 4px 2px 0',
              verticalAlign: 'middle',
              fontSize: '10px',
              fontWeight: 600,
              color: isUp ? '#1FC16B' : COLORS.error,
              fontFamily: "'Manrope', sans-serif",
              whiteSpace: 'nowrap',
            }}
          >
            {value}%
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function CardWithChange({
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
  const labelRowStyle = {
    height: '16px',
    maxHeight: '16px',
    padding: 0,
    verticalAlign: 'middle' as const,
    lineHeight: '16px',
    fontSize: '12px',
  };
  return (
    <Card>
      <Row style={{ height: '16px', maxHeight: '16px', marginBottom: '8px' }}>
        <Column style={labelRowStyle}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '1.32px',
              textTransform: 'uppercase',
              color: '#99A0AE',
              margin: 0,
              padding: 0,
              fontFamily: 'JetBrains Mono, monospace',
              lineHeight: '16px',
              display: 'block',
            }}
          >
            {label}
          </span>
        </Column>
        <Column style={{ ...labelRowStyle, width: '1%', whiteSpace: 'nowrap' }}>
          <ChangeBadge value={change} isUp={isUp} />
        </Column>
      </Row>
      <Text
        style={{
          fontSize: '32px',
          fontWeight: 600,
          color: COLORS.cardText,
          margin: '0',
          lineHeight: '40px',
          fontFamily: "'Manrope', sans-serif",
          letterSpacing: '-0.192px',
        }}
      >
        {formatNumber(value)}
      </Text>
    </Card>
  );
}

interface IDetailConfig {
  value: string | number;
  prefix?: string;
  suffix?: string;
  valueStyle?: React.CSSProperties;
}

function CardWithDetail({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: number;
  unit: string;
  detail: IDetailConfig;
}) {
  return (
    <Card>
      <Text style={{ ...sectionLabelStyle }}>{label}</Text>
      <table
        role="presentation"
        cellPadding="0"
        cellSpacing="0"
        style={{ margin: '8px 0 12px', padding: '0', borderCollapse: 'collapse' }}
      >
        <tbody>
          <tr>
            <td style={{ padding: '0 8px 0 0', verticalAlign: 'baseline' }}>
              <span style={mediumNumberStyle}>{formatNumber(value)}</span>
            </td>
            <td style={{ padding: '0', verticalAlign: 'baseline' }}>
              <Text style={{ ...sectionLabelStyle }}>{unit}</Text>
            </td>
          </tr>
        </tbody>
      </table>
      <DetailTextWithValue
        value={detail.value}
        prefix={detail.prefix}
        suffix={detail.suffix}
        valueStyle={detail.valueStyle}
      />
    </Card>
  );
}

function RankedListCard({
  items,
  title,
  showWorkflowIcon = false,
  showProviderIcon = false,
  minRows = 0,
}: {
  items: ITopProvider[];
  title: string;
  showWorkflowIcon?: boolean;
  showProviderIcon?: boolean;
  minRows?: number;
}) {
  const emptyRowCount = Math.max(0, minRows - items.length);

  return (
    <Card>
      <Text style={sectionLabelStyle}>{title}</Text>
      <Section
        style={{
          marginTop: '12px',
          backgroundColor: COLORS.listBg,
          borderRadius: '8px',
          padding: '8px',
        }}
      >
        {items.map((item, idx) => {
          const iconUrl = showProviderIcon ? getProviderIconUrl(item.name) : item.icon;

          return (
            <Row key={idx} style={{ margin: '0', padding: '3px' }}>
              <Column>
                <table role="presentation" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      {showWorkflowIcon && (
                        <td style={{ padding: '0 10px 0 0', verticalAlign: 'middle', width: '12px' }}>
                          <Img
                            src={`${EMAIL_ICONS_BASE_URL}/report-emails/winding-arrow.svg`}
                            alt=""
                            width={12}
                            height={9}
                            style={{ display: 'block' }}
                          />
                        </td>
                      )}
                      {iconUrl && (
                        <td style={{ padding: '0 10px 0 0', verticalAlign: 'middle' }}>
                          <Img src={iconUrl} alt="icon" width={16} height={16} style={{ display: 'block' }} />
                        </td>
                      )}
                      <td style={{ padding: '0', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '12px', color: COLORS.dark, fontWeight: 500 }}>{item.name}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Column>
              <Column style={{ ...listValueCellStyle }}>{formatNumber(item.count)}</Column>
            </Row>
          );
        })}
        {Array.from({ length: emptyRowCount }).map((_, idx) => (
          <Row key={`spacer-${idx}`} style={{ margin: '0', padding: '3px' }}>
            <Column>
              <span style={{ fontSize: '8px', color: 'transparent' }}>&nbsp;</span>
            </Column>
            <Column style={{ ...listValueCellStyle }}>&nbsp;</Column>
          </Row>
        ))}
      </Section>
    </Card>
  );
}

function CircularProgress({
  percentage,
  value,
  color,
  size = 100,
  strokeWidth = 10,
}: {
  percentage: number;
  value: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  const textSize = size * 0.12;
  const compact = formatCompact(value);

  return (
    <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: '100%', margin: '0', padding: '0' }}>
      <tbody>
        <tr>
          <td align="center" style={{ padding: '0' }}>
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              style={{
                display: 'block',
                margin: '0 auto',
              }}
            >
              <g transform={`rotate(-90 ${center} ${center})`}>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={COLORS.border}
                  strokeWidth={strokeWidth}
                />
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </g>
              <text
                x={center}
                y={center}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: textSize,
                  fontWeight: 700,
                  fill: 'black',
                  fontFamily: 'Manrope, sans-serif',
                }}
              >
                {compact}
              </text>
            </svg>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function ChannelsSection({ channels }: { channels: IChannel[] }) {
  const activeChannels = channels.filter((ch) => ch.value > 0);
  const totalMessages = activeChannels.reduce((sum, ch) => sum + ch.value, 0);

  const channelsWithPercentage = activeChannels.map((channel) => ({
    ...channel,
    percentage: totalMessages > 0 ? Math.round((channel.value / totalMessages) * 100) : 0,
  }));

  return (
    <Card style={{ marginBottom: '12px' }}>
      <Text style={sectionLabelStyle}>Delivery by Channels</Text>
      <Section style={{ marginTop: '24px' }}>
        <Row>
          {channelsWithPercentage.map((channel, idx) => (
            <Column
              key={idx}
              style={{
                textAlign: 'center' as const,
                padding: '12px 8px',
                verticalAlign: 'top' as const,
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <CircularProgress
                  percentage={channel.percentage}
                  value={channel.value}
                  color={channel.color}
                  size={100}
                  strokeWidth={10}
                />
              </div>
              <Text
                style={{
                  fontSize: '12px',
                  color: COLORS.muted,
                  textTransform: 'uppercase' as const,
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  margin: '0',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {channel.name}
              </Text>
            </Column>
          ))}
        </Row>
      </Section>
    </Card>
  );
}

function FooterCta({ dashboardUrl }: { dashboardUrl: string }) {
  return (
    <Card
      style={{
        marginBottom: '24px',
        textAlign: 'center' as const,
        padding: '32px 24px',
      }}
    >
      <Row>
        <Column>
          <Text
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase' as const,
              color: '#6C7275',
              margin: '0 0 16px',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            THAT'S THE WEEK
          </Text>
        </Column>
      </Row>

      <Row style={{ marginTop: '8px', marginBottom: '8px' }}>
        <Column>
          <Text
            style={{
              fontSize: '16px',
              color: COLORS.cardText,
              margin: '0 0 8px',
              lineHeight: '1.5',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            This message self-destructs in seven days.
          </Text>
        </Column>
      </Row>

      <Row>
        <Column>
          <Text
            style={{
              fontSize: '15px',
              color: COLORS.cardText,
              margin: '0 0 28px',
              lineHeight: '1.5',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            (Kidding. It's an email.)
          </Text>
        </Column>
      </Row>

      <Row style={{ marginTop: '20px' }}>
        <Column>
          <Button
            href={dashboardUrl}
            style={{
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.00) 100%), var(--novu-500, #DD2450)',
              backgroundColor: COLORS.accent,
              color: COLORS.white,
              fontSize: '14px',
              fontWeight: 600,
              padding: '12px 28px',
              borderRadius: 'var(--radius-8, 8px)',
              border: '1px solid var(--gradients-linear-12, rgba(255, 255, 255, 0.12))',
              boxShadow: '0 1px 2px 0 rgba(14, 18, 27, 0.24), 0 0 0 1px var(--primary-base, #DD2450)',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            View dashboard &gt;
          </Button>
        </Column>
      </Row>
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
    <Section style={{ textAlign: 'center', padding: '24px 0' }}>
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

export function UsageReportEmail({ props }: { props: IEmailProps }) {
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
    successRate,
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
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');`}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: COLORS.bg }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: COLORS.bg }}>
          <NovuLogo />
          <RecapHeader dateRange={dateRange} />

          <Section style={{ marginBottom: '12px' }}>
            <Row>
              <Column style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
                <CardWithChange
                  label="Messages Sent"
                  value={messagesSent}
                  change={messagesSentChange}
                  isUp={messagesSentUp}
                />
              </Column>
              <Column style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
                <CardWithChange
                  label="Users Reached"
                  value={usersReached}
                  change={usersReachedChange}
                  isUp={usersReachedUp}
                />
              </Column>
            </Row>
          </Section>

          <Section style={{ marginBottom: '12px' }}>
            <Row>
              <Column style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
                <CardWithDetail
                  label="Workflow Runs Triggered"
                  value={workflowRuns}
                  unit="workflow runs"
                  detail={{
                    value: `${successRate}%`,
                    prefix: 'with ',
                    suffix: ' success rate.',
                  }}
                />
              </Column>
              <Column style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
                <CardWithDetail
                  label="User Interactions"
                  value={userInteractions}
                  unit="interactions"
                  detail={{
                    value: `${interactionRate}%`,
                    suffix: ' of all in-app messages are interacted.',
                    // valueStyle: { fontWeight: 500 },
                  }}
                />
              </Column>
            </Row>
          </Section>

          <Section style={{ marginBottom: '12px' }}>
            <Row>
              <Column style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
                <RankedListCard
                  title="Top Delivery Providers"
                  items={topProviders}
                  showProviderIcon
                  minRows={Math.max(topProviders.length, topWorkflows.length)}
                />
              </Column>
              <Column style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
                <RankedListCard
                  title="Top Workflows"
                  items={topWorkflows}
                  showWorkflowIcon
                  minRows={Math.max(topProviders.length, topWorkflows.length)}
                />
              </Column>
            </Row>
          </Section>

          <ChannelsSection channels={channels} />

          <FooterCta dashboardUrl={dashboardUrl} />
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

// export default function UsageReportEmailPreview() {
//   return (
//     <UsageReportEmail
//       props={{
//         dateRange: 'Jan 1 - Jan 31, 2024',
//         messagesSent: 45678,
//         messagesSentChange: 12,
//         messagesSentUp: true,
//         usersReached: 12345,
//         usersReachedChange: 8,
//         usersReachedUp: true,
//         workflowRuns: 3456,
//         successRate: 97.7,
//         userInteractions: 8910,
//         interactionRate: 95.5,
//         topProviders: [
//           { name: 'SendGrid', count: 15234, icon: 'https://placehold.co/16x16' },
//           { name: 'Twilio', count: 8456, icon: 'https://placehold.co/16x16' },
//           { name: 'Slack', count: 5678, icon: 'https://placehold.co/16x16' },
//         ],
//         topWorkflows: [
//           { name: 'Welcome Email', count: 5678 },
//           { name: 'Order Confirmation', count: 2345 },
//         ],
//         channels: [
//           { name: 'Email', value: 25678, color: '#3b82f6', dashArray: '0' },
//           { name: 'SMS', value: 12345, color: '#10b981', dashArray: '0' },
//           { name: 'Push', value: 7655, color: '#f59e0b', dashArray: '0' },
//         ],
//         dashboardUrl: 'https://dashboard.novu.co',
//         previewText: 'Your monthly Novu usage report',
//       }}
//     />
//   );
// }

export default async function renderEmail(payload: any, controls: any) {
  return await render(<UsageReportEmail props={{ ...payload, ...controls }} />);
}
