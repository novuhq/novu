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
import { findRootKeyOffsets } from './override-json';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** `RiCornerDownRightLine`'s path. */
const CORNER_DOWN_RIGHT_PATH =
  'M4.99989 13.9999L4.99976 5L6.99976 4.99997L6.99986 11.9999L17.1717 12L13.222 8.05024L14.6362 6.63603L21.0001 13L14.6362 19.364L13.222 17.9497L17.1717 14L4.99989 13.9999Z';

function createCornerDownRightIcon(): SVGSVGElement {
  const icon = document.createElementNS(SVG_NAMESPACE, 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'currentColor');
  icon.setAttribute('class', 'size-[11px] shrink-0');

  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('d', CORNER_DOWN_RIGHT_PATH);
  icon.append(path);

  return icon;
}

class OverriddenKeyChipWidget extends WidgetType {
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

    const text = document.createElement('span');
    text.textContent = this.label;

    chip.append(createCornerDownRightIcon(), text);

    return chip;
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
