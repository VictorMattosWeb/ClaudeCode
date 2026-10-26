import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "@/lib/cx";
import { GhostIconButton, PrimaryButton, SecondaryButton } from "./primitives";

/**
 * Modal: o design system não tem um; deriva do card claro (rounded-3xl p-6, sombra de seis camadas)
 * sobre o "glass panel" bg-stone-900/30.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-stone-900/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          "relative flex max-h-[92vh] w-full flex-col ring-1 ring-stone-200 bg-white rounded-t-3xl sm:rounded-3xl shadow-deep",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
          </div>
          <GhostIconButton icon={X} label="Fechar" ring onClick={onClose} />
        </div>
        <div className="ds-scroll flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Excluir",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </PrimaryButton>
        </>
      }
    >
      <div className="text-sm text-stone-500">{message}</div>
    </Modal>
  );
}

/**
 * Popover ancorado ao gatilho. Painel = card claro em rounded-2xl; itens no estilo ghost (hover:bg-stone-50).
 * Renderizado no <body> com posição fixa: nunca fica escondido sob cards com overflow-hidden ou colunas
 * com rolagem, abre para cima quando falta espaço embaixo e fica acima dos modais (z-60 > z-50).
 */
export function Popover({
  trigger,
  children,
  align = "left",
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const gap = 8;
    const { offsetWidth: w, offsetHeight: h } = panel;
    const left = Math.max(gap, Math.min(align === "right" ? anchor.right - w : anchor.left, window.innerWidth - w - gap));
    const below = window.innerHeight - anchor.bottom;
    const up = below < h + gap * 2 && anchor.top > below;
    const top = up ? Math.max(gap, anchor.top - h - gap) : anchor.bottom + gap;
    setPos({ top, left });
  }, [align]);

  // Mede depois que o painel existe no DOM, antes de pintar: abre já no lugar certo.
  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true); // true: acompanha também a rolagem de colunas e listas
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  return (
    <div ref={anchorRef} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
            className={cx("z-[60] min-w-[220px] max-w-[calc(100vw-16px)] ring-1 ring-stone-200 bg-white rounded-2xl shadow-card p-2", className)}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function MenuItem({
  icon: Icon,
  children,
  onClick,
  danger,
  disabled,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none",
        danger ? "text-rose-600" : "text-stone-700",
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-[.12em] text-stone-400">{children}</p>;
}
