import { useState } from 'react';

export const useExpandToggle = (defaultValue: boolean = true) => {
  const [isExpanded, setExpanded] = useState<boolean>(defaultValue);

  return [isExpanded, () => setExpanded((prevExpanded) => !prevExpanded)] as const;
};
