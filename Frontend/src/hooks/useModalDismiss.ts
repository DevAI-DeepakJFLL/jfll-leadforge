import { useEffect, RefObject } from 'react';

export interface UseModalDismissOptions {
  isOpen: boolean;
  onClose: () => void;
  modalRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;
}

export function useModalDismiss({
  isOpen,
  onClose,
  modalRef,
  closeOnEscape = true,
  closeOnClickOutside = false,
}: UseModalDismissOptions): void {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        closeOnClickOutside &&
        modalRef?.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (closeOnClickOutside) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (closeOnClickOutside) {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [isOpen, onClose, modalRef, closeOnEscape, closeOnClickOutside]);
}
