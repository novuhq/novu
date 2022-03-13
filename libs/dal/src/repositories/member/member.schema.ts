import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { MemberEntity } from './member.entity';

const memberSchema = new Schema(
  {
    invite: {
      email: Schema.Types.String,
      token: {
        type: Schema.Types.String,
        index: true,
      },
      invitationDate: Schema.Types.Date,
      answerDate: Schema.Types.Date,
      _inviterId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    memberStatus: Schema.Types.String,
    _userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    roles: [Schema.Types.String],
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
  },
  schemaOptions
);

interface IMemberDocument extends MemberEntity, Document {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _id: any;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Member = mongoose.models.Member || mongoose.model<IMemberDocument>('Member', memberSchema);
