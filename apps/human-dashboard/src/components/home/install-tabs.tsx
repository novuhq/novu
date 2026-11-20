'use client';

import { useState } from 'react';
import { CommandLines } from '@/components/home/documentation';
import type { InstallOption } from '@/data/home';

/** CLI and MCP, one at a time, in the same pipe-separated style as the host list. */
export function InstallTabs({ options }: { options: readonly InstallOption[] }) {
  const [activeId, setActiveId] = useState(options[0]?.id ?? '');
  const active = options.find((option) => option.id === activeId) ?? options[0];

  if (!active) return null;

  function moveSelection(fromId: string, offset: number) {
    const index = options.findIndex((option) => option.id === fromId);
    const next = options[(index + offset + options.length) % options.length];
    setActiveId(next.id);
    document.getElementById(`install-${next.id}`)?.focus();
  }

  return (
    <div className="home-install">
      <div role="tablist" aria-label="Install" className="home-tabs">
        {options.map((option, index) => (
          <span key={option.id}>
            {index > 0 ? (
              <span aria-hidden="true" className="home-link-divider">
                |
              </span>
            ) : null}
            <button
              type="button"
              role="tab"
              id={`install-${option.id}`}
              aria-controls={`install-panel-${option.id}`}
              aria-selected={option.id === active.id}
              tabIndex={option.id === active.id ? 0 : -1}
              className="home-tab"
              onClick={() => setActiveId(option.id)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  moveSelection(option.id, 1);
                }
                if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  moveSelection(option.id, -1);
                }
              }}
            >
              {option.label}
            </button>
          </span>
        ))}
      </div>
      {options.map((option) => (
        <div
          key={option.id}
          role="tabpanel"
          id={`install-panel-${option.id}`}
          aria-labelledby={`install-${option.id}`}
          hidden={option.id !== active.id}
        >
          <CommandLines commands={option.commands} />
        </div>
      ))}
    </div>
  );
}
