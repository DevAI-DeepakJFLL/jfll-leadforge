import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

export interface FilterItemOption {
  value: string;
  label: string;
  count?: number;
}

export interface SearchableCheckboxListProps {
  options: FilterItemOption[] | string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  minItemsForSearch?: number;
  emptyMessage?: string;
  className?: string;
}

export const SearchableCheckboxList: React.FC<SearchableCheckboxListProps> = ({
  options,
  selectedValues,
  onToggle,
  searchPlaceholder = 'Search...',
  showSearch = true,
  minItemsForSearch = 6,
  emptyMessage = 'No matching options',
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Normalize options to object form
  const normalizedOptions: FilterItemOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  const shouldRenderSearch = showSearch && normalizedOptions.length >= minItemsForSearch;

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return normalizedOptions;
    }
    const q = searchTerm.toLowerCase();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchTerm]);

  return (
    <div className={`space-y-2 ${className}`}>
      {shouldRenderSearch && (
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-apollo focus:ring-1 focus:ring-apollo transition-all"
          />
        </div>
      )}

      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
        {filteredOptions.length === 0 ? (
          <div className="py-2 text-center text-slate-400 text-[11px]">
            {emptyMessage}
          </div>
        ) : (
          filteredOptions.map((opt) => {
            const isSelected = selectedValues.includes(opt.value);

            return (
              <label
                key={opt.value}
                className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 transition-colors cursor-pointer group select-none text-xs"
              >
                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(opt.value)}
                    className="w-3.5 h-3.5 rounded text-apollo border-slate-300 focus:ring-apollo focus:ring-1 focus:ring-offset-0 cursor-pointer"
                  />
                  <span
                    className={`truncate transition-colors ${
                      isSelected
                        ? 'font-medium text-apollo-900 font-semibold'
                        : 'text-slate-700 group-hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </span>
                </div>

                {opt.count !== undefined && (
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                    {opt.count}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SearchableCheckboxList;
