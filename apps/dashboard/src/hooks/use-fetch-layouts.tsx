import { useQuery } from '@tanstack/react-query';

import { LayoutsFilter } from '@/components/layouts/hooks/use-layouts-url-state';

// Mock data for now - this would be replaced with actual API call
const mockEmailLayouts = [
  {
    _id: '1',
    name: 'Newsletter Layout',
    identifier: 'newsletter-layout',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:45:00Z',
    isDefault: true,
  },
  {
    _id: '2',
    name: 'Transactional Layout',
    identifier: 'transactional-layout',
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-18T11:20:00Z',
    isDefault: false,
  },
];

export const useFetchLayouts = (filterValues: LayoutsFilter) => {
  return useQuery({
    queryKey: ['email-layouts', filterValues],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Filter mock data based on filters
      let filteredLayouts = mockEmailLayouts;

      if (filterValues.query) {
        filteredLayouts = filteredLayouts.filter(
          (layout) =>
            layout.name.toLowerCase().includes(filterValues.query.toLowerCase()) ||
            layout.identifier.toLowerCase().includes(filterValues.query.toLowerCase())
        );
      }

      return {
        data: filteredLayouts,
        next: null,
        previous: null,
      };
    },
  });
};
