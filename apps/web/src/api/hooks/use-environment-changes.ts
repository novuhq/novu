import { useQuery } from 'react-query';
import { getCurrentEnvironment } from '../environment';
import { getPromotedChanges, getUnpromotedChanges } from '../changes';

export function useEnvironmentChanges() {
  const {
    data: changes,
    isLoading: isLoadingChanges,
    refetch: refetchChanges,
  } = useQuery('currentChanges', getUnpromotedChanges, {
    placeholderData: () => generateChanges(false),
    enabled: false,
  });

  const {
    data: history,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery('currentChanges', getPromotedChanges, {
    placeholderData: () => generateChanges(true),
    enabled: false,
  });

  return {
    changes,
    isLoadingChanges,
    refetchChanges,
    history,
    isLoadingHistory,
    refetchHistory,
  };
}

const placeholderData = [
  {
    id: '1',
    type: 'NotificationTemplate',
    changedBy: { firstName: 'gosha', lastName: 'gosha' },
    createdAt: new Date(),
    enabled: false,
    change: 'this text changed',
  },
  {
    id: '2',
    type: 'MessageTemplate',
    changedBy: { firstName: 'dima', lastName: 'dima' },
    createdAt: new Date(),
    enabled: false,
    change: 'this text changed',
  },
  {
    id: '3',
    type: 'NotificationTemplate',
    changedBy: { firstName: 'david', lastName: 'david' },
    createdAt: new Date(),
    enabled: false,
    change: 'this text changed',
  },
  {
    id: '4',
    type: 'MessageTemplate',
    changedBy: { firstName: 'gali', lastName: 'gali' },
    createdAt: new Date(),
    enabled: true,
    change: 'this text changed',
  },
];

const generateChanges = (promoted: boolean) => {
  return {
    data: placeholderData.filter(({ enabled }) => enabled === promoted),
  };
};
