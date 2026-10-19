export interface IBulkInviteRequestDto {
  invitees: {
    email: string;
  }[];
}

export interface IBulkInviteResponse {
  success: boolean;
  email: string;
}
