export enum MemberStatusEnum {
  NEW = 'new',
  ACTIVE = 'active',
  INVITED = 'invited',
}

export interface IMemberInvite {
  email: string;
  token: string;
  invitationDate: Date;
  answerDate?: Date;
  _inviterId: string;
}
