import { useRef, useState } from 'react';

export const useHoverOverTemplate = () => {
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = (id?: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setTemplateId(id);
    }, 500);
  };

  const onMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setTemplateId(undefined);
  };

  return {
    templateId,
    onMouseEnter,
    onMouseLeave,
  };
};
