import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { MemberDBModel } from './member.entity';

const memberSchema = new Schema<MemberDBModel>(
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

memberSchema.index({
  _userId: 1,
});

memberSchema.index({
  'invite.token': 1,
});

memberSchema.index({
  _organizationId: 1,
});

memberSchema.index({
  'organizationId._userId._id': 1,
});

export const Member =
  (mongoose.models.Member as mongoose.Model<MemberDBModel>) || mongoose.model<MemberDBModel>('Member', memberSchema);
