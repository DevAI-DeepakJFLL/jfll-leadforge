import { useState, useCallback } from 'react';

export interface UseClipboardOptions {
  resetTimeout?: number;
  onSuccess?: (text: string, fieldId?: string) => void;
  onError?: (error: unknown) => void;
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const { resetTimeout = 2000, onSuccess, onError } = options;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string, fieldId = 'default'): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        onSuccess?.(text, fieldId);

        setTimeout(() => {
          setCopiedField((current) => (current === fieldId ? null : current));
        }, resetTimeout);

        return true;
      } catch (err) {
        console.error('[useClipboard] Failed to copy to clipboard:', err);
        onError?.(err);
        return false;
      }
    },
    [resetTimeout, onSuccess, onError]
  );

  const isCopied = useCallback((fieldId = 'default') => copiedField === fieldId, [copiedField]);

  return {
    copy,
    copiedField,
    isCopied,
  };
}
