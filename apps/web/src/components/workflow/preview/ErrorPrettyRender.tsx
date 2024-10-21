import { useDisclosure } from '@mantine/hooks';
import { css } from '@novu/novui/css';
import { Text } from '@novu/novui';
import { hstack } from '@novu/novui/patterns';
import { Center, Stack } from '@novu/novui/jsx';
import { IconErrorOutline, IconExpandLess, IconExpandMore } from '@novu/novui/icons';

export function ErrorPrettyRender({ error: unparsedError }) {
  const [isExpanded, { toggle }] = useDisclosure();
  const error = 'response' in unparsedError ? unparsedError?.response?.data : unparsedError;
  /*
   * TODO: find a way to import ErrorCodeEnum from @novu/framework without transiently importing
   * types that are not available in the browser, like `crypto`
   */
  const isInvalidControlSyntax = error?.code === 'StepControlCompilationFailedError';

  // If invalid syntax of var (e.g. missing closing bracket {{var {{var}), show preview as loading.
  if (isInvalidControlSyntax) {
    return null;
  }

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
                whiteSpace: 'pre-wrap',
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
              {error.data?.stack}
              {!error.data?.stack && JSON.stringify(error.data, null, 2)}
            </pre>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}
