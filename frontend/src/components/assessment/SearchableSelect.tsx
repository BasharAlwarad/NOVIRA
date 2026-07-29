'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';

export interface SearchableSelectOption {
  label: string;
  value: string;
  description?: string;
}

interface SearchableSelectProps {
  options: ReadonlyArray<SearchableSelectOption>;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search…',
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.description?.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((index) =>
        Math.min(index + 1, filteredOptions.length - 1)
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const highlighted = filteredOptions[highlightedIndex];
      if (highlighted) {
        onChange(highlighted.value);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm shadow-slate-200/50 transition-all duration-200 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="h-5 w-5 shrink-0 text-slate-400"
        >
          <path
            d="M9 17a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm9-1-4.35-4.35"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <input
          type="text"
          role="searchbox"
          aria-controls="occupation-field-listbox"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      <ul
        id="occupation-field-listbox"
        role="listbox"
        className="max-h-64 space-y-1 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-200/50"
      >
        {filteredOptions.length === 0 ? (
          <li className="px-4 py-3 text-sm text-slate-500">
            No matches — try a different search.
          </li>
        ) : (
          filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;
            const previousDescription = filteredOptions[index - 1]?.description;
            const showGroupHeader =
              option.description && option.description !== previousDescription;

            return (
              <li key={option.value}>
                {showGroupHeader ? (
                  <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase first:pt-1">
                    {option.description}
                  </p>
                ) : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onChange(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={[
                    'flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors sm:text-base',
                    isSelected
                      ? 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200'
                      : isHighlighted
                        ? 'bg-slate-50 text-slate-900'
                        : 'text-slate-700',
                  ].join(' ')}
                >
                  {option.label}
                  {isSelected ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-4 w-4 shrink-0 text-emerald-600"
                    >
                      <path
                        d="M4 10.5L8.25 14.75L16 6.25"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
