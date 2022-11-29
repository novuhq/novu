import { useContext } from 'react';
import { ScreenContext } from '../store/screens.context';

export const useScreens = () => useContext(ScreenContext);
