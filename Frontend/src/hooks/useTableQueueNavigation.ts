import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseTableQueueNavigationOptions<T = any> {
  /** Array of items to navigate through */
  items?: readonly T[];
  /** Total count of items if items array is omitted */
  itemCount?: number;
  /** Current selected index for controlled usage */
  selectedIndex?: number;
  /** Initial selected index for uncontrolled usage (default: 0) */
  initialIndex?: number;
  /** Callback fired when selectedIndex changes via keyboard or manual navigation */
  onNavigate?: (index: number, item?: T) => void;
  /** Callback fired when Escape key is pressed */
  onClose?: () => void;
  /** Whether keyboard navigation is enabled (default: true) */
  enabled?: boolean;
}

export interface UseTableQueueNavigationReturn<T = any> {
  selectedIndex: number;
  selectedItem?: T;
  setSelectedIndex: (index: number | ((prev: number) => number)) => void;
  goToNext: () => void;
  goToPrev: () => void;
}

/**
 * Checks whether an event target is an interactive form element or editable field
 * where arrow keys, j/k, or escape should not trigger table navigation.
 */
function isEditableElement(target: any): boolean {
  if (!target || typeof target !== 'object') return false;
  const tagName = typeof target.tagName === 'string' ? target.tagName.toUpperCase() : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (Boolean(target.isContentEditable)) {
    return true;
  }
  if (typeof target.getAttribute === 'function' && target.getAttribute('contenteditable') === 'true') {
    return true;
  }
  if (typeof target.closest === 'function') {
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }
  return false;
}

/**
 * Hook for keyboard-driven queue navigation across table rows / detail drawers.
 *
 * Supports:
 * - 'j' and 'ArrowDown' to advance selectedIndex by +1
 * - 'k' and 'ArrowUp' to decrement selectedIndex by -1
 * - 'Escape' to trigger onClose()
 * - Automatic boundary clamping [0, items.length - 1]
 * - Suppression when focused inside inputs, textareas, selects, or contenteditable
 * - Toggling via `enabled` option
 */
export function useTableQueueNavigation<T = any>({
  items,
  itemCount,
  selectedIndex: controlledIndex,
  initialIndex = 0,
  onNavigate,
  onClose,
  enabled = true,
}: UseTableQueueNavigationOptions<T> = {}): UseTableQueueNavigationReturn<T> {
  const totalCount = items ? items.length : (itemCount ?? 0);
  const isControlled = controlledIndex !== undefined;

  const [internalIndex, setInternalIndex] = useState<number>(() => {
    const init = controlledIndex ?? initialIndex ?? 0;
    return totalCount > 0 ? Math.max(0, Math.min(init, totalCount - 1)) : 0;
  });

  const activeIndex = isControlled ? controlledIndex : internalIndex;

  // Storing latest values in refs to avoid rebinding window listener on every keystroke
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const totalCountRef = useRef(totalCount);
  totalCountRef.current = totalCount;

  const isControlledRef = useRef(isControlled);
  isControlledRef.current = isControlled;

  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Clamp internal index if total count shrinks
  useEffect(() => {
    if (totalCount > 0 && internalIndex >= totalCount) {
      setInternalIndex(totalCount - 1);
    }
  }, [totalCount, internalIndex]);

  const navigateTo = useCallback((targetIndex: number) => {
    const count = totalCountRef.current;
    if (count <= 0) return;
    const clamped = Math.max(0, Math.min(targetIndex, count - 1));
    const current = activeIndexRef.current;
    if (clamped !== current) {
      if (!isControlledRef.current) {
        setInternalIndex(clamped);
      }
      onNavigateRef.current?.(clamped, itemsRef.current?.[clamped]);
    }
  }, []);

  const goToNext = useCallback(() => {
    navigateTo(activeIndexRef.current + 1);
  }, [navigateTo]);

  const goToPrev = useCallback(() => {
    navigateTo(activeIndexRef.current - 1);
  }, [navigateTo]);

  const setSelectedIndex = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const next = typeof updater === 'function' ? updater(activeIndexRef.current) : updater;
      navigateTo(next);
    },
    [navigateTo]
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isEditableElement(e.target)) return;

      if (e.key === 'Escape') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const key = e.key.toLowerCase();
      if (key === 'j' || e.key === 'ArrowDown') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        goToNext();
      } else if (key === 'k' || e.key === 'ArrowUp') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return {
    selectedIndex: activeIndex,
    selectedItem: items ? items[activeIndex] : undefined,
    setSelectedIndex,
    goToNext,
    goToPrev,
  };
}
