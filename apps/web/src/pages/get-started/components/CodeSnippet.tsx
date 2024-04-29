import { IconContentCopy } from '@novu/design-system';
import { useClipboard } from '@mantine/hooks';
import { css } from '../../../styled-system/css';
import { useIsDarkTheme } from '../../../hooks';

export const CodeSnippet = ({ command, onClick = () => {} }: { command: string; onClick?: () => void }) => {
  const { copy } = useClipboard();
  const isDark = useIsDarkTheme();

  return (
    <div
      className={css({
        backgroundColor: isDark ? 'legacy.B20' : 'legacy.B98',
        borderRadius: 12,
        padding: 16,
        height: 52,
        width: '50%',
        color: isDark ? 'mauve.10.dark' : 'legacy.b40',
        marginTop: 8,
      })}
    >
      <div className={css({ display: 'flex', justifyContent: 'space-between' })}>
        <div>{command}</div>
        <button
          onClick={() => {
            onClick();
            copy(command);
          }}
        >
          <IconContentCopy width="22" height="22" />
        </button>
      </div>
    </div>
  );
};
