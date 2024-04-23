import { IIconProps, IconCheck, IconContentCopy } from '@novu/design-system';
import { LocalizedMessage } from '@novu/shared-web';
import { FC } from 'react';
import { IconButton } from './IconButton';

interface IClipboardIconButtonProps extends Pick<IIconProps, 'color' | 'size'> {
  handleCopy: () => void;
  isCopied: boolean;
  testId?: string;
  tooltipLabel?: LocalizedMessage;
}

export const ClipboardIconButton: FC<IClipboardIconButtonProps> = ({
  handleCopy,
  isCopied,
  testId,
  tooltipLabel,
  ...iconProps
}) => {
  return (
    <IconButton
      onClick={handleCopy}
      data-test-id={testId}
      tooltipProps={{ label: tooltipLabel ?? isCopied ? 'Copied!' : 'Copy key' }}
    >
      {isCopied ? <IconCheck {...iconProps} /> : <IconContentCopy {...iconProps} />}
    </IconButton>
  );
};
