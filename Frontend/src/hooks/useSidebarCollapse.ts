import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'leadforge_sidebar_collapsed';

export interface UseSidebarCollapseReturn {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleCollapse: () => void;
}

export function useSidebarCollapse(initialState = false): UseSidebarCollapseReturn {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          return stored === 'true';
        }
      }
    } catch {
      // Fallback on storage errors
    }
    return initialState;
  });

  const setIsCollapsed = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      setIsCollapsedState((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, String(next));
          }
        } catch {
          // Ignore write errors
        }
        return next;
      });
    },
    []
  );

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, [setIsCollapsed]);

  // Global keyboard shortcut: Cmd+B (Mac) or Ctrl+B (Windows/Linux) to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        // Don't intercept when user is actively typing in form fields
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        toggleCollapse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse]);

  return {
    isCollapsed,
    setIsCollapsed,
    toggleCollapse,
  };
}
