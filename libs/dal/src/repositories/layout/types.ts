import { Types } from 'mongoose';
export { ChannelTypeEnum, IEmailBlock, ITemplateVariable } from '@novu/shared';

export { EnvironmentId } from '../environment';
export { ExternalSubscriberId, SubscriberId } from '../subscriber';
export { OrganizationId } from '../organization';
export { UserId } from '../user';

export type LayoutId = Types.ObjectId;
export type LayoutName = string;
export type LayoutDescription = string;
