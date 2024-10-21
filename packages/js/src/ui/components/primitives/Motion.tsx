import { Motion as MotionPrimitive, MotionProxy, MotionProxyComponent } from 'solid-motionone';
import { useAppearance } from '../../context';

export const Motion = new Proxy(MotionPrimitive, {
  get:
    (_, tag: string): MotionProxyComponent<any> =>
    (props) => {
      const { animations } = useAppearance();

      return <MotionPrimitive {...props} tag={tag} transition={animations() ? props.transition : { duration: 0 }} />;
    },
}) as MotionProxy;
