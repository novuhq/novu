import { WithHttp } from '../novu.interface';
import {
  IOrganizations,
  IOrganizationCreatePayload,
  IOrganizationRenamePayload,
  IOrganizationUpdateMemberRolePayload,
  IOrganizationBrandingPayload,
} from './organizations.interface';

export class Organizations extends WithHttp implements IOrganizations {
  list() {
    return this.http.get('/organizations');
  }

  create(payload: IOrganizationCreatePayload) {
    return this.http.post('/organizations', payload);
  }

  rename(payload: IOrganizationRenamePayload) {
    return this.http.patch('/organizations', payload);
  }

  getCurrent() {
    return this.http.get('/organizations/me');
  }

  removeMember(memberId: string) {
    return this.http.delete(`/organizations/members/${memberId}`);
  }

  updateMemberRole(
    memberId: string,
    payload: IOrganizationUpdateMemberRolePayload
  ) {
    return this.http.put(`/organizations/members/${memberId}/roles`, payload);
  }

  getMembers() {
    return this.http.get('/organizations/members');
  }

  updateBranding(payload: IOrganizationBrandingPayload) {
    return this.http.put('/organizations/branding', payload);
  }
}
