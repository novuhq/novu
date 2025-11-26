import { TranslationGroupDto } from '@novu/api/models/components';
import { useCallback, useEffect, useState } from 'react';

export function useTranslationDrawerState(translationGroups?: TranslationGroupDto[]) {
  const [selectedTranslationGroup, setSelectedTranslationGroup] = useState<TranslationGroupDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleTranslationClick = useCallback((translationGroup: TranslationGroupDto) => {
    setSelectedTranslationGroup(translationGroup);
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback((isOpen: boolean) => {
    setIsDrawerOpen(isOpen);

    if (!isOpen) {
      setSelectedTranslationGroup(null);
    }
  }, []);

  useEffect(() => {
    if (translationGroups && selectedTranslationGroup) {
      const updatedGroup = translationGroups.find((group) => group.resourceId === selectedTranslationGroup.resourceId);

      if (updatedGroup && updatedGroup.updatedAt !== selectedTranslationGroup.updatedAt) {
        setSelectedTranslationGroup(updatedGroup);
      }
    }
  }, [translationGroups, selectedTranslationGroup]);

  return {
    selectedTranslationGroup,
    isDrawerOpen,
    handleTranslationClick,
    handleDrawerClose,
  };
}
