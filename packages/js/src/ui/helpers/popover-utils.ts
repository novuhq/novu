import { PopoverProps } from '../components';

const COMMON_POSITION_CLASSES = {
  top: `nt-bottom-full nt-left-1/2 `,
  bottom: `nt-top-full nt-left-1/2 `,
  left: `nt-right-full nt-top-1/2 `,
  right: `nt-left-full nt-top-1/2 `,
};

const defaultTranslateValues = {
  topAndBottom: {
    start: {
      x: '0%',
      y: '0%',
    },
    end: {
      x: '-100%',
      y: '0%',
    },
    default: {
      x: '-50%',
      y: '0%',
    },
  },
  leftAndRight: {
    start: {
      x: '0%',
      y: '0%',
    },
    end: {
      x: '0%',
      y: '-100%',
    },
    default: {
      x: '0%',
      y: '-50%',
    },
  },
};

const convertToCalc = (defaultValue: string, offsetValue: string | number) => {
  const offset = typeof offsetValue === 'number' ? `${offsetValue}px` : offsetValue;

  return `calc(${defaultValue} + ${offset})`;
};

export const getPositionClasses = (position: PopoverProps['position']) => {
  switch (position) {
    case 'top':
    case 'top-start':
    case 'top-end':
      return `${COMMON_POSITION_CLASSES.top}`;

    case 'bottom':
    case 'bottom-start':
    case 'bottom-end':
      return `${COMMON_POSITION_CLASSES.bottom}`;

    case 'left':
    case 'left-start':
    case 'left-end':
      return `${COMMON_POSITION_CLASSES.left}`;

    case 'right':
    case 'right-start':
    case 'right-end':
      return `${COMMON_POSITION_CLASSES.right}`;

    default:
      return `${COMMON_POSITION_CLASSES.bottom}`;
  }
};

export const getOffsetTranslate = (offset: PopoverProps['offset'], position: PopoverProps['position']) => {
  const offsetValueX = offset?.y || 0;
  const offsetValueY = offset?.x || 0;
  switch (position) {
    case 'top':
    case 'bottom': {
      const defaultValueX = defaultTranslateValues.topAndBottom.default.x;
      const defaultValueY = defaultTranslateValues.topAndBottom.default.y;

      const translateX = convertToCalc(defaultValueX, offsetValueX);
      const translateY = convertToCalc(defaultValueY, offsetValueY);

      return {
        transform: `translateX(${translateX}) translateY(${translateY})`,
      };
    }

    case 'top-start':
    case 'bottom-start': {
      const defaultValueX = defaultTranslateValues.topAndBottom.start.x;
      const defaultValueY = defaultTranslateValues.topAndBottom.start.y;

      const translateX = convertToCalc(defaultValueX, offsetValueX);
      const translateY = convertToCalc(defaultValueY, offsetValueY);

      return {
        transform: `translateX(${translateX}) translateY(${translateY})`,
      };
    }

    case 'top-end':
    case 'bottom-end': {
      const defaultValueX = defaultTranslateValues.topAndBottom.end.x;
      const defaultValueY = defaultTranslateValues.topAndBottom.end.y;

      const translateX = convertToCalc(defaultValueX, offsetValueX);
      const translateY = convertToCalc(defaultValueY, offsetValueY);

      return {
        transform: `translateX(${translateX}) translateY(${translateY})`,
      };
    }

    case 'left':
    case 'right': {
      const defaultValueX = defaultTranslateValues.leftAndRight.default.x;
      const defaultValueY = defaultTranslateValues.leftAndRight.default.y;

      const translateX = convertToCalc(defaultValueX, offsetValueX);
      const translateY = convertToCalc(defaultValueY, offsetValueY);

      return {
        transform: `translateX(${translateX}) translateY(${translateY})`,
      };
    }

    case 'left-start':
    case 'right-start': {
      const defaultValueX = defaultTranslateValues.leftAndRight.start.x;
      const defaultValueY = defaultTranslateValues.leftAndRight.start.y;

      const translateX = convertToCalc(defaultValueX, offsetValueX);
      const translateY = convertToCalc(defaultValueY, offsetValueY);

      return {
        transform: `translateX(${translateX}) translateY(${translateY})`,
      };
    }

    case 'left-end':
    case 'right-end': {
      const defaultValueX = defaultTranslateValues.leftAndRight.end.x;
      const defaultValueY = defaultTranslateValues.leftAndRight.end.y;

      const translateX = convertToCalc(defaultValueX, offsetValueX);
      const translateY = convertToCalc(defaultValueY, offsetValueY);

      return {
        transform: `translateX(${translateX}) translateY(${translateY})`,
      };
    }

    default:
      const defaultValueX = defaultTranslateValues.topAndBottom.default.x;
      const defaultValueY = defaultTranslateValues.topAndBottom.default.y;

      const translateX = defaultValueX;
      const translateY = defaultValueY;

      return {
        transform: `translateX(${translateX}) translateY(${translateY})`,
      };
  }
};
