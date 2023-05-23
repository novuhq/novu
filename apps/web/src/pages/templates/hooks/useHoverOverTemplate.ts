import { useRef, useState } from 'react';

export const useHoverOverTemplate = () => {
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const timoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = (id?: string) => {
    if (timoutRef.current) {
      clearTimeout(timoutRef.current);
    }
    timoutRef.current = setTimeout(() => {
      setTemplateId(id);
    }, 500);
  };

  const onMouseLeave = () => {
    if (timoutRef.current) {
      clearTimeout(timoutRef.current);
    }
    setTemplateId(undefined);
  };

  return {
    templateId,
    onMouseEnter,
    onMouseLeave,
  };
};
