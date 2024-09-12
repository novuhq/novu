import { ISubscriberJwt } from '../../entities/user';

export interface ISessionDto {
  token: string;
  profile: ISubscriberJwt;
}
