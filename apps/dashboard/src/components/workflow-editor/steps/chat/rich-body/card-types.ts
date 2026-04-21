/**
 * Structural mirror of the `CardElement` tree from the `chat` package.
 * We keep the typings local (instead of importing from `chat`) because
 * the dashboard bundle can't use the ESM-only package directly, and
 * because we only care about the subset our editor authors.
 */

export type CardBlock =
  | TextBlock
  | HeadingBlock
  | DividerBlock
  | ActionsBlock
  | LinkBlock
  | FieldsBlock
  | ImageBlock;

export interface TextBlock {
  id: string;
  kind: 'text';
  content: string;
  style?: 'plain' | 'bold' | 'muted';
}

/**
 * "Heading" isn't a distinct element type in `CardElement`, but authors
 * want a clear H1-like block. We serialize it to a bold `TextElement`.
 */
export interface HeadingBlock {
  id: string;
  kind: 'heading';
  content: string;
}

export interface DividerBlock {
  id: string;
  kind: 'divider';
}

export interface LinkBlock {
  id: string;
  kind: 'link';
  label: string;
  url: string;
}

export interface FieldEntry {
  id: string;
  label: string;
  value: string;
}

export interface FieldsBlock {
  id: string;
  kind: 'fields';
  fields: FieldEntry[];
}

export interface ImageBlock {
  id: string;
  kind: 'image';
  url: string;
  alt?: string;
}

export type ActionEntry = UrlActionEntry | CallbackActionEntry;

export interface UrlActionEntry {
  id: string;
  kind: 'link-button';
  label: string;
  url: string;
  style?: 'primary' | 'danger' | 'default';
}

export interface CallbackActionEntry {
  id: string;
  kind: 'button';
  actionId: string;
  label: string;
  style?: 'primary' | 'danger' | 'default';
}

export interface ActionsBlock {
  id: string;
  kind: 'actions';
  actions: ActionEntry[];
}

/**
 * Root document the editor drives. Adds its own metadata (title, subtitle,
 * imageUrl) plus the list of children. Mirrors `CardElement`.
 */
export interface ChatCardDoc {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  blocks: CardBlock[];
}
