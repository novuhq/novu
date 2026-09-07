export interface ISendblueMessageResponse {
  account_email?: string;
  content?: string;
  date_created?: string;
  date_updated?: string;
  error_code?: number;
  error_message?: string;
  from_number?: string;
  is_outbound?: boolean;
  media_url?: string;
  message_handle: string;
  message_type?: 'message' | 'group' | 'location';
  number?: string;
  status?: 'QUEUED' | 'SENT' | 'DELIVERED' | 'ERROR';
}
