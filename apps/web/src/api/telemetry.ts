import { api } from './api.client';

export const identifyUser = async (userData) => {
  try {
    const response = await api.post('/v1/telemetry/identify', userData);

    return response.data;
  } catch (error) {
    console.error('Error identifying user:', error);
  }
};
