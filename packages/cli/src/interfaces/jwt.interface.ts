export interface IJwt {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture: string;
  organizationId: string;
  roles: string[];
  applicationId: string;
  iat: number;
  exp: number;
  iss: string;
}
