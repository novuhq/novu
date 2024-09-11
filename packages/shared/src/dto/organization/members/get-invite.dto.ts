export interface IGetInviteResponseDto {
  inviter: {
    _id: string;
    firstName?: string | null;
    lastName?: string | null;
    profilePicture?: string | null;
  };
  organization: {
    _id: string;
    logo?: string;
    name: string;
  };
  email: string;
  _userId?: string;
}
