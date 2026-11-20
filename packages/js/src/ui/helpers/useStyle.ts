import { createSignal, onMount } from 'solid-js';
import { useAppearance } from '../context';
import { type ResolveStyleArgs, resolveStyle } from '../core/style/resolveStyle';

export const useStyle = () => {
  const appearance = useAppearance();
  const [isServer, setIsServer] = createSignal(true);

  onMount(() => {
    setIsServer(false);
  });

  return (args: ResolveStyleArgs) =>
    resolveStyle(args, {
      elements: appearance.elements(),
      appearanceKeyToCssInJsClass: appearance.appearanceKeyToCssInJsClass(),
      isServer: isServer(),
    });
};
