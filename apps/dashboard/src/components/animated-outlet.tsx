import { AnimatePresence } from 'motion/react';
import React, { Suspense, useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

type AnimatedOutletProps = {
  fallback?: React.ReactNode;
};

export const AnimatedOutlet = ({ fallback = null }: AnimatedOutletProps): React.JSX.Element => {
  const { pathname, state } = useLocation();
  const keyRef = useRef(pathname);
  const element = useOutlet();

  if (!state?.skipAnimation) {
    keyRef.current = pathname;
  }

  return (
    <Suspense fallback={fallback}>
      <AnimatePresence mode="wait" initial>
        {element && React.cloneElement(element, { key: keyRef.current })}
      </AnimatePresence>
    </Suspense>
  );
};
