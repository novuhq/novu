export interface IUserEntity {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  createdAt: string;
  showOnBoarding?: boolean;
  userHashForIntercom?: string;
}

export interface IJwtPayload {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  organizationId: string;
  environmentId: string;
  roles: string[];
  exp: number;
}
