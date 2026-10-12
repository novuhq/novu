import {
  Decoration,
  type DecorationSet,
  EditorView,
  type Extension,
  RangeSetBuilder,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@uiw/react-codemirror';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RiCornerDownRightLine } from 'react-icons/ri';
import { findRootKeyOffsets } from './override-json';

class OverriddenKeyChipWidget extends WidgetType {
  private iconRoot: Root | null = null;

  constructor(private readonly label: string) {
    super();
  }

  eq(other: OverriddenKeyChipWidget) {
    return other.label === this.label;
  }

  toDOM() {
    const chip = document.createElement('span');
    chip.className =
      'cm-overridden-key-chip bg-feature-lighter text-feature text-label-2xs pointer-events-none absolute right-0 top-1/2 inline-flex -translate-y-1/2 select-none items-center gap-1 rounded px-1.5 py-0.5 font-sans';
    chip.setAttribute('aria-label', this.label);

    const icon = document.createElement('span');
    icon.className = 'inline-flex';
    this.iconRoot = createRoot(icon);
    this.iconRoot.render(createElement(RiCornerDownRightLine, { className: 'size-[11px]' }));

    const text = document.createElement('span');
    text.textContent = this.label;

    chip.append(icon, text);

    return chip;
  }

  destroy() {
    const root = this.iconRoot;
    this.iconRoot = null;
    // CodeMirror can destroy widgets while React is committing, where a synchronous unmount is rejected.
    queueMicrotask(() => root?.unmount());
  }

  ignoreEvent() {
    return true;
  }
}

function buildChipDecorations(view: EditorView, labelsByKey: Record<string, string>): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const decoratedLines = new Set<number>();

  for (const { key, from } of findRootKeyOffsets(view.state.doc.toString())) {
    const label = labelsByKey[key];
    const line = view.state.doc.lineAt(from);

    if (!label || decoratedLines.has(line.number)) {
      continue;
    }

    decoratedLines.add(line.number);
    builder.add(line.to, line.to, Decoration.widget({ widget: new OverriddenKeyChipWidget(label), side: 1 }));
  }

  return builder.finish();
}

/**
 * Marks root keys of a provider-wide override that an integration override replaces, with a chip
 * pinned to the end of the key's line.
 */
export function overriddenKeyChips(labelsByKey: Record<string, string>): Extension {
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = buildChipDecorations(view, labelsByKey);
        }

        update(update: ViewUpdate) {
          if (update.docChanged) {
            this.decorations = buildChipDecorations(update.view, labelsByKey);
          }
        }
      },
      { decorations: (plugin) => plugin.decorations }
    ),
    EditorView.theme({ '.cm-line': { position: 'relative' } }),
  ];
}
