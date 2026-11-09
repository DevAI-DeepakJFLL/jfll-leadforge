import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a rapidly changing value by delaying updates
 * until after a specified delay has elapsed since the last change.
 *
 * @param value The value to debounce.
 * @param delayMs The debounce delay in milliseconds (defaults to 300ms).
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

export default useDebounce;
