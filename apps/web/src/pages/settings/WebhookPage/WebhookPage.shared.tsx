import { css } from '../../../styled-system/css';
import { styled } from '../../../styled-system/jsx';
import { text } from '../../../styled-system/recipes';

export const Text = styled('p', text, { defaultProps: { className: css({ color: 'typography.text.secondary' }) } });
