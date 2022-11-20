import { createStyles } from '@mantine/core';
import { colors } from '../../../design-system';

const useStyles = createStyles(() => ({
  phone: {
    display: 'block',
    margin: 'auto',
    width: '390px',
    height: '740px',
    position: 'relative',
    borderColor: colors.B20,
    borderWidth: '10px',
    borderStyle: 'solid',
    borderRadius: '40px',
  },
  cameraDent: {
    background: colors.B20,
    width: '148px',
    height: '30px',
    marginLeft: 'auto',
    marginRight: 'auto',
    borderRadius: '0 0 20px 20px',
  },
}));

export const Mobile = ({ children }) => {
  const { classes } = useStyles();

  return (
    <div className={classes.phone}>
      <div className={classes.cameraDent}></div>
      {children}
    </div>
  );
};
