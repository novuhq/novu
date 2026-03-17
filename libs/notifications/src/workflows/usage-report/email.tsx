import { providers as sharedProviders } from '@novu/shared';
import { Body, Column, Container, Head, Html, Img, Link, Preview, Row, render, Section } from '@react-email/components';
import millify from 'millify';
import React from 'react';
import { ControlValueSchema, PayloadSchemaType } from './schemas';

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

interface IRankedItem {
  name: string;
  count: number;
  icon?: string;
}

interface ITopProvider {
  name: string;
  count: number;
  icon: string;
}

interface ITopWorkflow extends IRankedItem {}

interface IChannel {
  name: string;
  value: number;
  color: string;
  dashArray: string;
  icon?: string;
}

interface ITopProviderInput {
  name: string;
  count: number;
}

interface IChannelInput {
  name: string;
  value: number;
}

export interface IEmailProps {
  dateRangeFrom: string;
  dateRangeTo?: string;
  messagesSent: number;
  messagesSentChange: number;
  messagesSentUp: boolean;
  usersReached: number;
  usersReachedChange: number;
  usersReachedUp: boolean;
  workflowRuns: number;
  userInteractions: number;
  interactionRate: number;
  topProviders: ITopProviderInput[];
  topWorkflows: ITopWorkflow[];
  channels: IChannelInput[];
  dashboardUrl: string;
  previewText?: string;
}

const NOVU_LOGO_URL = 'https://dashboard.novu.co/images/report-emails/novu-logo-dark.png';
const EMAIL_ICONS_BASE_URL = 'https://dashboard.novu.co/images';

const CHANNEL_CONFIG: Record<string, Omit<IChannel, 'value'>> = {
  in_app: {
    name: 'In-app',
    color: '#3b82f6',
    dashArray: '0',
    icon: `${EMAIL_ICONS_BASE_URL}/report-emails/bell.png`,
  },
  email: {
    name: 'Email',
    color: '#f59e0b',
    dashArray: '0',
    icon: `${EMAIL_ICONS_BASE_URL}/report-emails/email.png`,
  },
  chat: {
    name: 'Chat',
    color: '#8b5cf6',
    dashArray: '0',
    icon: `${EMAIL_ICONS_BASE_URL}/report-emails/chat.png`,
  },
  push: {
    name: 'Push',
    color: '#ec4899',
    dashArray: '0',
    icon: `${EMAIL_ICONS_BASE_URL}/report-emails/push.png`,
  },
  sms: {
    name: 'SMS',
    color: '#ef4444',
    dashArray: '0',
    icon: `${EMAIL_ICONS_BASE_URL}/report-emails/sms.png`,
  },
};

const PROVIDER_CONFIG: Record<string, { name: string; id: string }> = Object.fromEntries(
  sharedProviders.map((p) => [p.id, { name: p.displayName, id: p.id }])
);

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
  fontWeight: 600,
  letterSpacing: '0.12px',
  textTransform: 'uppercase',
  color: COLORS.textSoft,
  margin: '0',
  fontFamily: "'JetBrains Mono', monospace",
};

const mediumNumberStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 600,
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
  fontFamily: "'Manrope', sans-serif",
};

function getProviderIconUrl(providerId: string): string {
  return `${EMAIL_ICONS_BASE_URL}/report-emails/providers/light/${providerId}.png`;
}

/**
 */
function humanizeNumber(value: number): string {
  // if (value === 0) return '0';
  // if (value < 1000) return value.toLocaleString();

  return millify(value, {
    precision: 1,
    lowercase: false,
  });
}

/**
 * Formats a date to "MMM D, YYYY" format.
 * @example formatDate(new Date('2024-01-15')) // "Jan 15, 2024"
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * Formats a date range for display.
 * If only dateFrom is provided, returns just that date.
 * If both dates are provided, returns "MMM D - MMM D, YYYY" or "MMM D, YYYY - MMM D, YYYY"
 */
function formatDateRange(dateFrom: Date | string, dateTo?: Date | string): string {
  if (!dateTo) {
    return formatDate(dateFrom);
  }

  const from = typeof dateFrom === 'string' ? new Date(dateFrom) : dateFrom;
  const to = typeof dateTo === 'string' ? new Date(dateTo) : dateTo;
  const fromMonth = from.getMonth();
  const fromYear = from.getFullYear();
  const toMonth = to.getMonth();
  const toYear = to.getFullYear();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (fromYear === toYear && fromMonth === toMonth) {
    return `${monthNames[fromMonth]} ${from.getDate()} - ${to.getDate()}, ${fromYear}`;
  }

  if (fromYear === toYear) {
    return `${monthNames[fromMonth]} ${from.getDate()} - ${monthNames[toMonth]} ${to.getDate()}, ${fromYear}`;
  }

  return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
}

/**
 * Maps channel input data to full channel objects with styling and icons.
 */
function mapChannels(channels: PayloadSchemaType['channels']): IChannel[] {
  return channels
    .map((channel) => {
      const config = CHANNEL_CONFIG[channel.name.toLowerCase()];
      if (!config) {
        return null;
      }
      return {
        ...config,
        value: channel.value,
      };
    })
    .filter((ch): ch is IChannel => ch !== null);
}

/**
 * Maps provider input data to full provider objects with names and icons.
 */
function mapProviders(providers: PayloadSchemaType['topProviders']): ITopProvider[] {
  return providers
    .map((provider) => {
      const config = PROVIDER_CONFIG[provider.name.toLowerCase()];
      if (!config) {
        return null;
      }
      return {
        name: config.name,
        count: provider.count,
        icon: getProviderIconUrl(provider.name.toLowerCase()),
      };
    })
    .filter((p): p is ITopProvider => p !== null);
}

function NovuLogo() {
  return (
    <Section style={{ textAlign: 'center', padding: '24px 0 32px' }}>
      <Img src={NOVU_LOGO_URL} alt="Novu" width={92} height={24} style={{ margin: '0 auto' }} />
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
                src={`${EMAIL_ICONS_BASE_URL}/report-emails/calendar.png`}
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
    ? `${EMAIL_ICONS_BASE_URL}/report-emails/trend-up.png`
    : `${EMAIL_ICONS_BASE_URL}/report-emails/trend-down.png`;

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
              style={{ display: 'block', width: '11px', height: '6px' }}
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
            {humanizeNumber(value)}%
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
        {humanizeNumber(value)}
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
  detail?: IDetailConfig;
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
              <span style={mediumNumberStyle}>{humanizeNumber(value)}</span>
            </td>
            <td style={{ padding: '0', verticalAlign: 'baseline' }}>
              <Text style={{ ...sectionLabelStyle }}>{unit}</Text>
            </td>
          </tr>
        </tbody>
      </table>
      {detail ? (
        <DetailTextWithValue
          value={detail.value}
          prefix={detail.prefix}
          suffix={detail.suffix}
          valueStyle={detail.valueStyle}
        />
      ) : (
        <span style={{ ...detailTextStyle, visibility: 'hidden' }}>&nbsp;</span>
      )}
    </Card>
  );
}

/**
 * Renders invisible placeholder rows so adjacent ranked list cards (e.g. Top Providers and Top Workflows)
 * keep the same row count and align visually when one list has fewer items than the other.
 */
function EmptyListPlaceholderRows({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <Row key={`placeholder-${idx}`} style={{ margin: '0', padding: '3px' }}>
          <Column>
            <span style={{ fontSize: '8px', color: 'transparent' }}>&nbsp;</span>
          </Column>
          <Column style={{ ...listValueCellStyle }}>&nbsp;</Column>
        </Row>
      ))}
    </>
  );
}

function RankedListCard({
  items,
  title,
  showWorkflowIcon = false,
  minRows = 0,
}: {
  items: IRankedItem[];
  title: string;
  showWorkflowIcon?: boolean;
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
          const iconUrl = item.icon;

          return (
            <Row key={idx} style={{ margin: '0', padding: '3px' }}>
              <Column>
                <Row>
                  {showWorkflowIcon && (
                    <Column style={{ padding: '0 10px 0 0', verticalAlign: 'middle', width: '12px' }}>
                      <Img
                        src={`${EMAIL_ICONS_BASE_URL}/report-emails/winding-arrow.png`}
                        alt=""
                        width={12}
                        height={9}
                        style={{ display: 'block' }}
                      />
                    </Column>
                  )}
                  {iconUrl && (
                    <Column style={{ padding: '2px', verticalAlign: 'middle', width: '8px' }}>
                      <Img src={iconUrl} alt="icon" width={8} height={8} style={{ display: 'block' }} />
                    </Column>
                  )}
                  <Column style={{ padding: '0 0 0 4px', verticalAlign: 'middle' }}>
                    <Text
                      style={{
                        fontSize: '12px',
                        color: COLORS.dark,
                        fontWeight: 500,
                        fontFamily: "'Manrope', sans-serif",
                      }}
                      title={item.name.length > 26 ? item.name : undefined}
                    >
                      {item.name.length > 26 ? `${item.name.slice(0, 26)}...` : item.name}
                    </Text>
                  </Column>
                </Row>
              </Column>
              <Column style={{ ...listValueCellStyle }}>{humanizeNumber(item.count)}</Column>
            </Row>
          );
        })}
        <EmptyListPlaceholderRows count={emptyRowCount} />
      </Section>
    </Card>
  );
}

function ChannelsSection({ channels }: { channels: IChannel[] }) {
  const activeChannels = channels.filter((ch) => ch.value > 0);
  const totalMessages = activeChannels.reduce((sum, ch) => sum + ch.value, 0);

  const sortedChannels = [...activeChannels].sort((a, b) => b.value - a.value);
  const topChannel = sortedChannels[0];
  const otherChannels = sortedChannels.slice(1);

  if (!topChannel) {
    return null;
  }

  return (
    <Card style={{ marginBottom: '12px' }}>
      <Section>
        <Row>
          <Column
            className="col-half"
            style={{
              width: otherChannels.length > 0 ? '50%' : '100%',
              padding: '0 12px 0 0',
              verticalAlign: 'top' as const,
            }}
          >
            <Text style={sectionLabelStyle}>Delivery by Channels</Text>
            <Section style={{ width: '100%', marginTop: '12px' }}>
              <Row>
                <Column style={{ paddingBottom: '12px' }}>
                  <Section>
                    <Row>
                      <Column style={{ paddingRight: '8px', verticalAlign: 'middle', width: '32px' }}>
                        <Section
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: '1px solid #e2e2e2',
                            backgroundColor: '#fbfbfb',
                            padding: '4px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            lineHeight: '22px',
                          }}
                        >
                          {topChannel.icon && (
                            <Img
                              src={topChannel.icon}
                              alt=""
                              style={{
                                display: 'inline-block',
                                maxWidth: '22px',
                                maxHeight: '22px',
                                verticalAlign: 'middle',
                                margin: '0 auto',
                              }}
                            />
                          )}
                        </Section>
                      </Column>
                      <Column style={{ verticalAlign: 'middle' }}>
                        <Text
                          style={{
                            fontSize: '24px',
                            fontWeight: 600,
                            color: COLORS.cardText,
                            fontFamily: "'Manrope', sans-serif",
                            letterSpacing: '-0.144px',
                            lineHeight: '32px',
                            margin: 0,
                          }}
                        >
                          {topChannel.name}
                        </Text>
                      </Column>
                    </Row>
                  </Section>
                </Column>
              </Row>
              <Row>
                <Column>
                  <Text
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: COLORS.textSoft,
                      fontFamily: "'Manrope', sans-serif",
                      lineHeight: 'normal',
                      margin: 0,
                    }}
                  >
                    is your top channel with{' '}
                    <Text style={{ color: '#525866' }}>{humanizeNumber(topChannel.value)} messages</Text> sent
                    <br />
                    out of {humanizeNumber(totalMessages)} overall.
                  </Text>
                </Column>
              </Row>
            </Section>
          </Column>

          {otherChannels.length > 0 && (
            <Column
              className="col-half"
              style={{
                width: '50%',
                padding: '0 0 0 12px',
                verticalAlign: 'top' as const,
              }}
            >
              <Section
                style={{
                  width: '100%',
                  backgroundColor: COLORS.listBg,
                  borderRadius: '4px',
                  padding: '8px',
                }}
              >
                <Row>
                  <Column style={{ paddingBottom: '4px' }}>
                    <Text
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: COLORS.textSoft,
                        fontFamily: "'Manrope', sans-serif",
                        margin: 0,
                      }}
                    >
                      followed by,
                    </Text>
                  </Column>
                </Row>
                {otherChannels.map((channel, idx) => (
                  <Row key={idx}>
                    <Column style={{ paddingTop: idx > 0 ? '4px' : '0' }}>
                      <Section style={{ width: '100%' }}>
                        <Row>
                          <Column style={{ width: '175px', padding: '3px 0' }}>
                            <Section>
                              <Row>
                                <Column
                                  style={{
                                    paddingRight: '4px',
                                    width: '28px',
                                    textAlign: 'center' as const,
                                    verticalAlign: 'middle' as const,
                                  }}
                                >
                                  {channel.icon && (
                                    <Img
                                      src={channel.icon}
                                      alt=""
                                      style={{
                                        display: 'inline-block',
                                        maxWidth: '16px',
                                        maxHeight: '16px',
                                        margin: '0 auto',
                                        verticalAlign: 'middle',
                                      }}
                                    />
                                  )}
                                </Column>
                                <Column style={{ verticalAlign: 'middle' as const }}>
                                  <Text
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      color: '#525866',
                                      fontFamily: "'Manrope', sans-serif",
                                      margin: 0,
                                    }}
                                  >
                                    {channel.name}
                                  </Text>
                                </Column>
                              </Row>
                            </Section>
                          </Column>
                          <Column style={{ textAlign: 'right' as const, padding: '3px 0' }}>
                            <Text
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                fontFamily: "'Manrope', sans-serif",
                                margin: 0,
                                whiteSpace: 'nowrap' as const,
                              }}
                            >
                              <Text style={{ color: '#0E121B' }}>{humanizeNumber(channel.value)} </Text>
                              <Text style={{ color: COLORS.textSoft }}>messages</Text>
                            </Text>
                          </Column>
                        </Row>
                      </Section>
                    </Column>
                  </Row>
                ))}
              </Section>
            </Column>
          )}
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
          <Link
            href={dashboardUrl}
            style={{
              background: '#DF2E5B',
              color: COLORS.white,
              fontSize: '14px',
              fontWeight: 600,
              padding: '12px 28px',
              borderRadius: '8px',
              border: '1px solid #B8244A',
              boxShadow: '0 1px 2px 0 #C92952',
              textDecoration: 'none',
              display: 'inline-block',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            View dashboard
          </Link>
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

  const socialIconStyle: React.CSSProperties = {
    display: 'inline-block',
    width: 8,
    height: 8,
    margin: '0 4px',
    verticalAlign: 'middle',
  };

  return (
    <Section style={{ textAlign: 'center', padding: '24px 0' }}>
      <Text style={footerTextStyle}>Novu, Inc.,</Text>
      <Text style={footerTextStyle}>1209 Orange Street, Wilmington, DE 19801, United States</Text>
      <Text style={{ marginTop: '12px', marginBottom: '0' }}>
        <Link href="https://linkedin.com/company/novuco" style={{ textDecoration: 'none' }}>
          <Img
            src={`${EMAIL_ICONS_BASE_URL}/report-emails/linkedin-dot.png`}
            alt="LinkedIn"
            width={8}
            height={8}
            style={socialIconStyle}
          />
        </Link>
        <Link href="https://youtube.com/@novuhq" style={{ textDecoration: 'none' }}>
          <Img
            src={`${EMAIL_ICONS_BASE_URL}/report-emails/youtube-dot.png`}
            alt="YouTube"
            width={8}
            height={8}
            style={socialIconStyle}
          />
        </Link>
        <Link href="https://x.com/novuhq" style={{ textDecoration: 'none' }}>
          <Img
            src={`${EMAIL_ICONS_BASE_URL}/report-emails/x-dot.png`}
            alt="X"
            width={8}
            height={8}
            style={socialIconStyle}
          />
        </Link>
      </Text>
    </Section>
  );
}

export function UsageReportEmail({ props }: { props: PayloadSchemaType & ControlValueSchema }) {
  const {
    dateRangeFrom,
    dateRangeTo,
    messagesSent,
    messagesSentChange,
    messagesSentUp,
    usersReached,
    usersReachedChange,
    usersReachedUp,
    workflowRuns,
    userInteractions,
    interactionRate,
    topProviders: topProvidersInput,
    topWorkflows,
    channels: channelsInput,
    dashboardUrl,
    previewText = 'Your monthly Novu usage report',
  } = props;

  const dateRange = formatDateRange(dateRangeFrom, dateRangeTo);
  const channels = mapChannels(channelsInput);
  const topProviders = mapProviders(topProvidersInput);

  return (
    <Html lang="en">
      <Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          @media (max-width: 600px) {
            .email-container {
              padding-left: 12px !important;
              padding-right: 12px !important;
            }
            .row-section {
              margin-bottom: 0 !important;
            }
            .col-half {
              display: block !important;
              width: 100% !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
              margin-bottom: 12px !important;
            }
          }`}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: COLORS.bg }}>
        <Container
          className="email-container"
          style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: COLORS.bg }}
        >
          <NovuLogo />
          <RecapHeader dateRange={dateRange} />

          <Section className="row-section" style={{ marginBottom: '12px' }}>
            <Row>
              <Column className="col-half" style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
                <CardWithChange
                  label="Messages Sent"
                  value={messagesSent}
                  change={messagesSentChange}
                  isUp={messagesSentUp}
                />
              </Column>
              <Column className="col-half" style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
                <CardWithChange
                  label="Users Reached"
                  value={usersReached}
                  change={usersReachedChange}
                  isUp={usersReachedUp}
                />
              </Column>
            </Row>
          </Section>

          <Section className="row-section" style={{ marginBottom: '12px' }}>
            <Row>
              <Column
                className="col-half"
                style={{
                  width: userInteractions > 0 ? '50%' : '100%',
                  paddingRight: userInteractions > 0 ? '6px' : '0',
                  verticalAlign: 'top',
                }}
              >
                <CardWithDetail label="Workflow Runs Triggered" value={workflowRuns} unit="workflow runs" />
              </Column>
              {userInteractions > 0 && (
                <Column className="col-half" style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
                  <CardWithDetail
                    label="User Interactions"
                    value={userInteractions}
                    unit="interactions"
                    detail={{
                      value: `${interactionRate}%`,
                      suffix: ' of all messages are interacted.',
                    }}
                  />
                </Column>
              )}
            </Row>
          </Section>

          <Section className="row-section" style={{ marginBottom: '12px' }}>
            <Row>
              <Column className="col-half" style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
                <RankedListCard
                  title="Top Delivery Providers"
                  items={topProviders}
                  minRows={Math.max(topProviders.length, topWorkflows.length)}
                />
              </Column>
              <Column className="col-half" style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
                <RankedListCard
                  title="Top Workflows"
                  items={topWorkflows as IRankedItem[]}
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

// export default async function renderEmail(payload: PayloadSchemaType, controls: ControlValueSchema) {
//   return render(
//     <UsageReportEmail
//       props={{
//         dateRangeFrom: '2025-02-01',
//         dateRangeTo: '2025-02-28',
//         messagesSent: 4512212321121332,
//         messagesSentChange: 12,
//         messagesSentUp: true,
//         usersReached: 12345,
//         usersReachedChange: 8,
//         usersReachedUp: true,
//         workflowRuns: 3456,
//         userInteractions: 8910,
//         interactionRate: 95.5,
//         topProviders: [
//           { name: 'sendgrid', count: 15234 },
//           { name: 'twilio', count: 8456 },
//           { name: 'slack', count: 5678 },
//         ],
//         topWorkflows: [
//           { name: 'Welcome Email', count: 5678 },
//           { name: 'Order Confirmation sadqw2e1e1221e12e1e12e12e1e1e12e12e12e12e12e12e1e21e21e12e1', count: 2345 },
//         ],
//         channels: [
//           // { name: 'in_app', value: 2300 },
//           { name: 'email', value: 1762 },
//           { name: 'chat', value: 562 },
//           { name: 'push', value: 2 },
//           { name: 'sms', value: 62 },
//         ],
//         dashboardUrl: 'https://dashboard.novu.co',
//         previewText: 'Your monthly Novu usage report',
//       }}
//     />
//   );
// }

export default async function renderEmail(payload: PayloadSchemaType, controls: ControlValueSchema) {
  return await render(<UsageReportEmail props={{ ...payload, ...controls }} />);
}
