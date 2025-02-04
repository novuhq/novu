import { useRef } from 'react';

import { useState } from 'react';

export const useVariableListKeyboardNavigation = ({ maxIndex }: { maxIndex: number }) => {
  const variablesListRef = useRef<HTMLUListElement>(null);
  const [hoveredOptionIndex, setHoveredOptionIndex] = useState(0);

  const scrollToOption = (index: number) => {
    if (!variablesListRef.current) return;

    const listElement = variablesListRef.current;
    const optionElement = listElement.children[index] as HTMLLIElement;

    if (optionElement) {
      const containerHeight = listElement.clientHeight;
      const optionTop = optionElement.offsetTop;
      const optionHeight = optionElement.clientHeight;

      if (optionTop < listElement.scrollTop) {
        // Scroll up if option is above visible area
        listElement.scrollTop = optionTop;
      } else if (optionTop + optionHeight > listElement.scrollTop + containerHeight) {
        // Scroll down if option is below visible area
        listElement.scrollTop = optionTop + optionHeight - containerHeight;
      }
    }
  };

  const next = () => {
    if (hoveredOptionIndex === -1) {
      setHoveredOptionIndex(0);
      scrollToOption(0);
    } else {
      setHoveredOptionIndex((oldIndex) => {
        const newIndex = oldIndex === maxIndex ? 0 : oldIndex + 1;
        scrollToOption(newIndex);
        return newIndex;
      });
    }
  };

  const prev = () => {
    if (hoveredOptionIndex === -1) {
      setHoveredOptionIndex(maxIndex);
      scrollToOption(maxIndex);
    } else {
      setHoveredOptionIndex((oldIndex) => {
        const newIndex = oldIndex === 0 ? maxIndex : oldIndex - 1;
        scrollToOption(newIndex);
        return newIndex;
      });
    }
  };

  const reset = () => {
    setHoveredOptionIndex(-1);
  };

  const focusFirst = () => {
    setHoveredOptionIndex(0);
    scrollToOption(0);
  };

  return {
    variablesListRef,
    hoveredOptionIndex,
    next,
    prev,
    reset,
    focusFirst,
  };
};
