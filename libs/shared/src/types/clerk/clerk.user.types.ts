import { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { ClerkPaginationRequest } from '@clerk/types';
import { IServicesHashes } from '../../entities/user';
import { JobTitleEnum } from '../organization';

export type User = ClerkUser & UserMetadataParams;

export type UpdateUserParams = {
  firstName?: string;
  lastName?: string;
  username?: string;
  password?: string;
  skipPasswordChecks?: boolean;
  signOutOfOtherSessions?: boolean;
  primaryEmailAddressID?: string;
  primaryPhoneNumberID?: string;
  primaryWeb3WalletID?: string;
  profileImageID?: string;
  totpSecret?: string;
  backupCodes?: string[];
  externalId?: string;
  createdAt?: Date;
  createOrganizationEnabled?: boolean;
} & UserMetadataParams &
  (UserPasswordHashingParams | object);

export type UserListParams = ClerkPaginationRequest<
  UserCountParams & {
    orderBy?: WithSign<
      | 'createdAt'
      | 'updatedAt'
      | 'emailAddress'
      | 'web3wallet'
      | 'firstName'
      | 'lastName'
      | 'phoneNumber'
      | 'userName'
      | 'lastActiveAt'
      | 'lastSignInAt'
    >;
    lastActiveAtSince?: number;
    organizationId?: string[];
  }
>;

type WithSign<T extends string> = `+${T}` | `-${T}` | T;

type UserCountParams = {
  emailAddress?: string[];
  phoneNumber?: string[];
  username?: string[];
  web3Wallet?: string[];
  query?: string;
  userId?: string[];
  externalId?: string[];
};

export type UserPublicMetadata = {
  profilePicture?: string | null;
  showOnBoarding?: boolean;
  showOnBoardingTour?: number;
  servicesHashes?: IServicesHashes;
  jobTitle?: JobTitleEnum;
};

export type UserMetadataParams = {
  publicMetadata?: UserPublicMetadata;
  privateMetadata?: UserPrivateMetadata;
  unsafeMetadata?: UserUnsafeMetadata;
};

type UserPasswordHashingParams = {
  passwordDigest: string;
  passwordHasher: PasswordHasher;
};

type PasswordHasher =
  | 'argon2i'
  | 'argon2id'
  | 'bcrypt'
  | 'bcrypt_sha256_django'
  | 'md5'
  | 'pbkdf2_sha256'
  | 'pbkdf2_sha256_django'
  | 'pbkdf2_sha1'
  | 'phpass'
  | 'scrypt_firebase'
  | 'scrypt_werkzeug'
  | 'sha256';

export type GetUserOrganizationMembershipListParams = ClerkPaginationRequest<{
  userId: string;
}>;
