export interface IUserEntity {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profilePicture?: string | null;
  createdAt: string;
  showOnBoarding?: boolean;
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
