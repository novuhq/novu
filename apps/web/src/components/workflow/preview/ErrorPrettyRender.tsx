import { css } from '@novu/novui/css';
import { Text } from '@novu/novui';
import { Center } from '@novu/novui/jsx';
import { IconErrorOutline } from '@novu/novui/icons';

export function ErrorPrettyRender({ error }) {
  return (
    <div
      className={css({
        bg: 'input.border.error/20',
        borderColor: 'input.border.error !important',
        border: '1px solid !important',
        width: '100%',
        borderRadius: 'input !important',
        my: 'margins.layout.tabs.bottom !important',
        p: '125',
      })}
    >
      <Center gap={10}>
        <IconErrorOutline
          className={css({ fill: 'input.border.error !important' })}
          color={'input.border.error !important'}
        />
        <Text color={'input.border.error'} variant={'mono'}>
          Error
        </Text>
      </Center>
      <h3 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Error while rendering</h3>
      <div>{error.message}</div> <br />
      {error.data ? (
        <pre style={{ overflow: 'auto', background: 'input.surface !important', padding: 15 }}>
          {JSON.stringify(error.data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
