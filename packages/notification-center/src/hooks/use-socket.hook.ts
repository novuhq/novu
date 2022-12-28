import { useNovuContext } from './use-novu-context.hook';

export function useSocket() {
  const { socket } = useNovuContext();

  return {
    socket,
  };
}
