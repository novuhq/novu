import { Accessor, createEffect, createSignal, onCleanup, Setter } from 'solid-js';
import { useAppearance } from '../../../context';

export const useKeyboardNavigation = ({
  activeTab,
  setActiveTab,
  tabsContainer,
}: {
  activeTab: Accessor<string>;
  setActiveTab: Setter<string>;
  tabsContainer: Accessor<HTMLDivElement | undefined>;
}) => {
  const { container } = useAppearance();
  const [keyboardNavigation, setKeyboardNavigation] = createSignal(false);

  const getRoot = () => {
    const containerElement = container();

    return containerElement instanceof ShadowRoot ? containerElement : document;
  };

  createEffect(() => {
    const root = getRoot();

    const handleTabKey: EventListener = (event) => {
      if (!(event instanceof KeyboardEvent) || event.key !== 'Tab') {
        return;
      }

      const tabs = tabsContainer()?.querySelectorAll('[role="tab"]');
      if (!tabs || !root.activeElement) {
        return;
      }

      setKeyboardNavigation(Array.from(tabs).includes(root.activeElement));
    };

    root.addEventListener('keyup', handleTabKey);

    return onCleanup(() => root.removeEventListener('keyup', handleTabKey));
  });

  createEffect(() => {
    const root = getRoot();

    const handleArrowKeys: EventListener = (event) => {
      if (
        !keyboardNavigation() ||
        !(event instanceof KeyboardEvent) ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
      ) {
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

    root.addEventListener('keydown', handleArrowKeys);

    return onCleanup(() => root.removeEventListener('keydown', handleArrowKeys));
  });
};
