"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  aberto, onFechar, titulo, children, largura = "max-w-lg",
}: { aberto: boolean; onFechar: () => void; titulo: ReactNode; children: ReactNode; largura?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      onClick={(e) => e.target === ref.current && onFechar()}
      className={`m-auto w-[calc(100%-1.5rem)] ${largura} rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]`}
    >
      {aberto && (
        <div className="max-h-[88vh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">{titulo}</h2>
            <button type="button" onClick={onFechar} className="btn-fantasma -mr-2 -mt-1 p-2"><X size={18} /></button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
