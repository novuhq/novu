import { api } from './api.client';
import { format } from 'date-fns';

// eslint-disable-next-line @typescript-eslint/default-param-last
export function getActivityList(page = 0, filters) {
  return api.getFullResponse(`/v1/activity`, createPayload(page, filters));
}

export function getNotification(notificationId: string) {
  return api.getFullResponse(`/v1/activity/${notificationId}`);
}

export function getActivityStats() {
  return api.get(`/v1/activity/stats`);
}

export function getActivityGraphStats(filters) {
  return api.getFullResponse(`/v1/activity/graph/stats`, createPayload(0, filters));
}

const createPayload = (page: number, filters) => {
  return {
    page,
    channels: filters?.channels,
    templates: filters?.templates,
    search: filters?.search !== '' ? filters?.search : undefined,
    transactionId: filters?.transactionId !== '' ? filters?.transactionId : undefined,
    startDate: filters?.range[0], //? format(filters?.range[0], 'dd/MM/yyyy') : undefined,
    endDate: filters?.range[1], //? format(filters?.range[1], 'dd/MM/yyyy') : undefined,
    periodicity: filters.periodicity,
  };
};
