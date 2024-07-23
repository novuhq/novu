import { css } from '@novu/novui/css';
import { Button, Text, Title } from '@novu/novui';
import { Center, Stack, VStack } from '@novu/novui/jsx';
import { IconErrorOutline, IconExpandLess, IconExpandMore } from '@novu/novui/icons';
import { useDisclosure } from '@mantine/hooks';
import { hstack } from '@novu/novui/patterns';

export function ErrorPrettyRender({ error: unparsedError }) {
  const [isExpanded, { toggle }] = useDisclosure();
  const error = 'response' in unparsedError ? unparsedError?.response?.data : unparsedError;

  return (
    <Stack
      className={css({
        color: 'typography.text.feedback.alert',
        bg: 'input.border.error/20',
        border: 'solid',
        borderColor: 'input.border.error',
        width: '100%',
        borderRadius: 'input',
        my: 'margins.layout.tabs.bottom',
        p: '125',
      })}
    >
      <Center>
        <IconErrorOutline size="24" color={'inherit'} />
      </Center>

      <Text textAlign={'center'} color={'inherit'}>
        {error.message || 'Error while rendering'}
      </Text>

      {error.data ? (
        <Stack mt="100">
          <Center>
            <button
              onClick={toggle}
              className={hstack({
                gap: '50',
                cursor: 'pointer',
                _hover: { opacity: 'hover' },
              })}
            >
              <Text color="inherit">See more</Text>
              <>
                {isExpanded ? (
                  <IconExpandLess title="expand-less-section-icon" color="inherit" />
                ) : (
                  <IconExpandMore title="expand-more-section-icon" color="inherit" />
                )}
              </>
            </button>
          </Center>
          {isExpanded && (
            <pre
              className={css({
                overflow: 'auto',
                border: 'solid',
                borderColor: 'input.border.error/40',
                borderRadius: 'input',
                p: '75',
                mt: '25',
                color: 'typography.text.main',
                fontFamily: 'mono',
              })}
            >
              {JSON.stringify(error.data, null, 2)}
            </pre>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}
