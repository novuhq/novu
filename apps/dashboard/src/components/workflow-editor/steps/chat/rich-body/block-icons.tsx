import {
  RiHeading,
  RiImageLine,
  RiKey2Line,
  RiLink,
  RiListCheck,
  RiSeparator,
  RiSendPlane2Line,
  RiTextSnippet,
} from 'react-icons/ri';
import type { CardBlock } from './card-types';

export const BLOCK_ICONS: Record<CardBlock['kind'], React.ComponentType<{ className?: string }>> = {
  heading: RiHeading,
  text: RiTextSnippet,
  divider: RiSeparator,
  actions: RiSendPlane2Line,
  link: RiLink,
  fields: RiListCheck,
  image: RiImageLine,
};

export const BLOCK_LABEL: Record<CardBlock['kind'], string> = {
  heading: 'Heading',
  text: 'Text',
  divider: 'Divider',
  actions: 'Buttons',
  link: 'Link',
  fields: 'Fields',
  image: 'Image',
};

export const SlashMenuIcon = RiKey2Line;
