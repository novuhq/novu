export interface IGetInviteResponseDto {
  inviter: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePicture: string;
  };
  organization: {
    _id: string;
    logo: string;
    name: string;
  };
  email: string;
  _userId?: string;
}
