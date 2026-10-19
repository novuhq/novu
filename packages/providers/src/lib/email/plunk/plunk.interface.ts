export interface IPlunkResponse {
  success: boolean;
  emails?: {
    contact: {
      id: string;
      email: string;
    };
  }[];
  timestamp?: string;
}
