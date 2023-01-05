import { Types } from 'mongoose';
export { ChannelTypeEnum } from '@novu/shared';

export { EnvironmentId } from '../environment';
export { IEmailBlock, ITemplateVariable } from '../message-template';
export { ExternalSubscriberId, SubscriberId } from '../subscriber';
export { OrganizationId } from '../organization';
export { UserId } from '../user';

export type LayoutId = Types.ObjectId;
export type LayoutName = string;
