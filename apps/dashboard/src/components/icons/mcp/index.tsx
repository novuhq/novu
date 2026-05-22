import type { ComponentType, SVGProps } from 'react';
import { ActiveCampaignIcon } from './activecampaign';
import { AdobeExperienceManagerIcon } from './adobe-experience-manager';
import { AhrefsIcon } from './ahrefs';
import { AirtableIcon } from './airtable';
import { AirwallexIcon } from './airwallex';
import { AmplitudeIcon } from './amplitude';
import { ApolloIcon } from './apollo';
import { AsanaIcon } from './asana';
import { AtlassianRovoIcon } from './atlassian-rovo';
import { AttioIcon } from './attio';
import { AwsMarketplaceIcon } from './aws-marketplace';
import { BoxIcon } from './box';
import { BrexIcon } from './brex';
import { CanvaIcon } from './canva';
import { ClickupIcon } from './clickup';
import { CloudflareIcon } from './cloudflare';
import { ConfluenceIcon } from './confluence';
import { DatadogIcon } from './datadog';
import { DropboxIcon } from './dropbox';
import { FigmaIcon } from './figma';
import { GithubIcon } from './github';
import { GoogleAnalyticsIcon } from './google-analytics';
import { GoogleDriveIcon } from './google-drive';
import { GoogleSheetsIcon } from './google-sheets';
import { HubspotIcon } from './hubspot';
import { IntercomIcon } from './intercom';
import { JiraIcon } from './jira';
import { LinearIcon } from './linear';
import { LookerIcon } from './looker';
import { MixpanelIcon } from './mixpanel';
import { MondayIcon } from './monday';
import { MongodbAtlasIcon } from './mongodb-atlas';
import { NeonIcon } from './neon';
import { NotionIcon } from './notion';
import { OktaIcon } from './okta';
import { PagerdutyIcon } from './pagerduty';
import { PlaidIcon } from './plaid';
import { SalesforceIcon } from './salesforce';
import { SegmentIcon } from './segment';
import { SentryIcon } from './sentry';
import { ShopifyIcon } from './shopify';
import { SlackIcon } from './slack';
import { SnowflakeIcon } from './snowflake';
import { SquareIcon } from './square';
import { StripeIcon } from './stripe';
import { SupabaseIcon } from './supabase';
import { TwilioIcon } from './twilio';
import { ZapierIcon } from './zapier';
import { ZendeskIcon } from './zendesk';

export {
  ActiveCampaignIcon,
  AdobeExperienceManagerIcon,
  AhrefsIcon,
  AirtableIcon,
  AirwallexIcon,
  AmplitudeIcon,
  ApolloIcon,
  AsanaIcon,
  AtlassianRovoIcon,
  AttioIcon,
  AwsMarketplaceIcon,
  BoxIcon,
  BrexIcon,
  CanvaIcon,
  ClickupIcon,
  CloudflareIcon,
  ConfluenceIcon,
  DatadogIcon,
  DropboxIcon,
  FigmaIcon,
  GithubIcon,
  GoogleAnalyticsIcon,
  GoogleDriveIcon,
  GoogleSheetsIcon,
  HubspotIcon,
  IntercomIcon,
  JiraIcon,
  LinearIcon,
  LookerIcon,
  MixpanelIcon,
  MondayIcon,
  MongodbAtlasIcon,
  NeonIcon,
  NotionIcon,
  OktaIcon,
  PagerdutyIcon,
  PlaidIcon,
  SalesforceIcon,
  SegmentIcon,
  SentryIcon,
  ShopifyIcon,
  SlackIcon,
  SnowflakeIcon,
  SquareIcon,
  StripeIcon,
  SupabaseIcon,
  TwilioIcon,
  ZapierIcon,
  ZendeskIcon,
};

export type McpIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Maps a Claude MCP server id (matching `MCP_SERVERS[].id`) to a brand icon component.
 * Servers without an entry render no icon.
 */
export const MCP_ICONS: Record<string, McpIconComponent> = {
  activecampaign: ActiveCampaignIcon,
  'adobe-experience-manager': AdobeExperienceManagerIcon,
  ahrefs: AhrefsIcon,
  airtable: AirtableIcon,
  airwallex: AirwallexIcon,
  amplitude: AmplitudeIcon,
  apollo: ApolloIcon,
  asana: AsanaIcon,
  'atlassian-rovo': AtlassianRovoIcon,
  attio: AttioIcon,
  'aws-marketplace': AwsMarketplaceIcon,
  box: BoxIcon,
  brex: BrexIcon,
  canva: CanvaIcon,
  clickup: ClickupIcon,
  cloudflare: CloudflareIcon,
  confluence: ConfluenceIcon,
  datadog: DatadogIcon,
  dropbox: DropboxIcon,
  figma: FigmaIcon,
  github: GithubIcon,
  'google-analytics': GoogleAnalyticsIcon,
  'google-drive': GoogleDriveIcon,
  'google-sheets': GoogleSheetsIcon,
  hubspot: HubspotIcon,
  intercom: IntercomIcon,
  jira: JiraIcon,
  linear: LinearIcon,
  looker: LookerIcon,
  mixpanel: MixpanelIcon,
  monday: MondayIcon,
  'mongodb-atlas': MongodbAtlasIcon,
  neon: NeonIcon,
  notion: NotionIcon,
  okta: OktaIcon,
  pagerduty: PagerdutyIcon,
  plaid: PlaidIcon,
  salesforce: SalesforceIcon,
  segment: SegmentIcon,
  sentry: SentryIcon,
  shopify: ShopifyIcon,
  slack: SlackIcon,
  snowflake: SnowflakeIcon,
  square: SquareIcon,
  stripe: StripeIcon,
  supabase: SupabaseIcon,
  twilio: TwilioIcon,
  zapier: ZapierIcon,
  zendesk: ZendeskIcon,
};

export function getMcpIcon(id: string | undefined | null): McpIconComponent | undefined {
  if (!id) return undefined;

  return MCP_ICONS[id];
}
