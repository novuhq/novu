import { createStyles } from '@mantine/core';
import { colors } from '@novu/design-system';

const useStyles = createStyles((theme) => ({
  phone: {
    display: 'block',
    margin: 'auto',
    width: '400px',
    height: '740px',
    position: 'relative',
    borderColor: theme.colorScheme === 'dark' ? colors.B20 : colors.B85,
    borderWidth: '10px',
    borderStyle: 'solid',
    borderRadius: '40px',
  },
  cameraDent: {
    background: theme.colorScheme === 'dark' ? colors.B20 : colors.B85,
    width: '148px',
    height: '30px',
    marginLeft: 'auto',
    marginRight: 'auto',
    borderRadius: '0 0 20px 20px',
  },
}));

export const EmailMobile = ({ children }) => {
  const { classes } = useStyles();

  return (
    <div className={classes.phone}>
      <div className={classes.cameraDent}></div>
      {children}
    </div>
  );
};
