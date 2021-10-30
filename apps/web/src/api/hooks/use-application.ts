import { useQuery } from 'react-query';
import { IApplication } from '@notifire/shared';
import { getCurrentApplication } from '../application';

export function useApplication() {
  const { data: application, isLoading, refetch } = useQuery<IApplication>('currentApplication', getCurrentApplication);

  return {
    application,
    loading: isLoading,
    refetch,
  };
}
