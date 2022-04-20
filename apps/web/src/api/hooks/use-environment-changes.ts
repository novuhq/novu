import { useQuery } from 'react-query';
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
    changedBy: { firstName: 'Doc', lastName: 'sus' },
    createdAt: new Date(),
    enabled: false,
    change: 'Description',
  },
  {
    id: '2',
    type: 'MessageTemplate',
    changedBy: { firstName: 'arthur', lastName: 'pendragon' },
    createdAt: new Date(),
    enabled: false,
    change: 'Text changed',
  },
  {
    id: '3',
    type: 'NotificationTemplate',
    changedBy: { firstName: 'Moses', lastName: 'of Egypt' },
    createdAt: new Date(),
    enabled: false,
    change: 'Be free',
  },
  {
    id: '4',
    type: 'MessageTemplate',
    changedBy: { firstName: 'harry', lastName: 'potter' },
    createdAt: new Date(),
    enabled: true,
    change: 'Expelliarmus',
  },
  {
    id: '5',
    type: 'MessageTemplate',
    changedBy: { firstName: 'mr', lastName: 'x' },
    createdAt: new Date(),
    enabled: true,
    change: 'Powerful change',
  },
];

const generateChanges = (promoted: boolean) => {
  return {
    data: placeholderData.filter(({ enabled }) => enabled === promoted),
  };
};
