import { Accessor, createEffect, createSignal, onCleanup, Setter } from 'solid-js';

export const useKeyboardNavigation = ({
  activeTab,
  setActiveTab,
  tabsContainer,
}: {
  activeTab: Accessor<string>;
  setActiveTab: Setter<string>;
  tabsContainer: Accessor<HTMLDivElement | undefined>;
}) => {
  const [keyboardNavigation, setKeyboardNavigation] = createSignal(false);

  createEffect(() => {
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const tabs = tabsContainer()?.querySelectorAll('[role="tab"]');
      if (!tabs || !document.activeElement) {
        return;
      }

      setKeyboardNavigation(Array.from(tabs).includes(document.activeElement));
    };

    document.addEventListener('keyup', handleTabKey);

    return onCleanup(() => document.removeEventListener('keyup', handleTabKey));
  });

  createEffect(() => {
    const handleArrowKeys = (event: KeyboardEvent) => {
      if (!keyboardNavigation() || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
        return;
      }

      const tabElements = Array.from<HTMLButtonElement>(tabsContainer()?.querySelectorAll('[role="tab"]') ?? []);
      const tabIds = tabElements.map((tab) => tab.id);
      const currentIndex = tabIds.indexOf(activeTab());
      const { length } = tabIds;
      let activeIndex = currentIndex;
      let newTab = activeTab();
      if (event.key === 'ArrowLeft') {
        activeIndex = currentIndex === 0 ? length - 1 : currentIndex - 1;
        newTab = tabIds[activeIndex];
      } else if (event.key === 'ArrowRight') {
        activeIndex = currentIndex === length - 1 ? 0 : currentIndex + 1;
        newTab = tabIds[activeIndex];
      }

      tabElements[activeIndex].focus();
      setActiveTab(newTab);
    };

    document.addEventListener('keydown', handleArrowKeys);

    return onCleanup(() => document.removeEventListener('keydown', handleArrowKeys));
  });
};
