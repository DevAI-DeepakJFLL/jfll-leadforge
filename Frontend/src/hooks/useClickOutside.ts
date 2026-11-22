import { useEffect, RefObject } from 'react';

/**
 * Hook to detect clicks and Escape key presses outside an active popover/dropdown element.
 * Closes the popover on outside click or Escape, stopping keydown propagation so parent
 * modals or slide-over drawers do not accidentally close at the same time.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [ref, handler, enabled]);
}
