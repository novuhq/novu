import { css } from '@novu/novui/css';
import { styled } from '@novu/novui/jsx';
import { text } from '@novu/novui/recipes';

export const Text = styled('p', text, { defaultProps: { className: css({ color: 'typography.text.secondary' }) } });
