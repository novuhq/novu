import { Loader, Paper } from '@mantine/core';
import { colors, Text } from '../../design-system';

const VercelSetupLoader = () => {
  return (
    <Paper
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Loader color={colors.error} size={32} />
      <Text>Setting up Vercel Integration...</Text>
    </Paper>
  );
};

export default VercelSetupLoader;
