export interface IPhotonUserResponse {
  succeed: boolean;
  data: {
    id: string;
    projectId: string;
    type: 'shared' | 'dedicated';
    phoneNumber: string;
    assignedPhoneNumber?: string;
  } | null;
  code?: string;
  message?: string;
}
