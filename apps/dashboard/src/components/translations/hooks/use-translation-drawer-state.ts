import { useState, useCallback, useEffect } from 'react';
import { TranslationGroup } from '@/api/translations';

export function useTranslationDrawerState(translationGroups?: TranslationGroup[]) {
  const [selectedTranslationGroup, setSelectedTranslationGroup] = useState<TranslationGroup | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleTranslationClick = useCallback((translationGroup: TranslationGroup) => {
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
