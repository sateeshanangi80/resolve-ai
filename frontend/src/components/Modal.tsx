import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export default function Modal({ children, titleId, onClose, busy = false, wide = false, className = '' }: {
  children: ReactNode; titleId: string; onClose: () => void; busy?: boolean; wide?: boolean; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={ref} className={`modal${wide ? ' modal-wide' : ''} ${className}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    {children}
  </dialog>;
}
