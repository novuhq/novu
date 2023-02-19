import { useNovuContext } from './useNovuContext';

export function useSocket() {
  const { socket } = useNovuContext();

  return {
    socket,
  };
}
