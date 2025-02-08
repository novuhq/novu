import { UserSession } from '@novu/testing';
import { IUpdateNotificationTemplateDto } from '@novu/shared';
import axios from 'axios';

const axiosInstance = axios.create();

export async function getNotificationTemplate(session: UserSession, id: string) {
  return await axiosInstance.get(`${session.serverUrl}/v1/workflows/${id}`, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}

export async function updateNotificationTemplate(
  session: UserSession,
  id: string,
  data: IUpdateNotificationTemplateDto
) {
  return await axiosInstance.put(`${session.serverUrl}/v1/workflows/${id}`, data, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}
