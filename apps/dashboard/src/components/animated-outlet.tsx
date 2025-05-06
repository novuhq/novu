import React, { useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';

export const AnimatedOutlet = (): React.JSX.Element => {
  const { pathname, state } = useLocation();
  const keyRef = useRef(pathname);
  const element = useOutlet();

  if (!state?.skipAnimation) {
    keyRef.current = pathname;
  }

  return (
    <AnimatePresence mode="wait" initial>
      {element && React.cloneElement(element, { key: keyRef.current })}
    </AnimatePresence>
  );
};
