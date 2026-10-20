import { useAppearance } from '../context/AppearanceContext';

/** The engine's motion mode: `full`, `reduced` (fades only) or `off`. */
export const useMotion = () => useAppearance().motionMode;
