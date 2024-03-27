export interface IOrganizations {
  list();
  create(payload: IOrganizationCreatePayload);
  rename(payload: IOrganizationRenamePayload);
  getCurrent();
  removeMember(memberId: string);
  updateMemberRole(
    memberId: string,
    payload: IOrganizationUpdateMemberRolePayload
  );
  getMembers();
  updateBranding(payload: IOrganizationBrandingPayload);
}

export interface IOrganizationCreatePayload {
  name: string;
  logo?: string;
}

export interface IOrganizationRenamePayload {
  name: string;
}

export interface IOrganizationUpdateMemberRolePayload {
  role: string;
}

export interface IOrganizationBrandingPayload {
  logo: string;
  color: string;
  fontColor?: string;
  contentBackground?: string;
  fontFamily: string;
}
