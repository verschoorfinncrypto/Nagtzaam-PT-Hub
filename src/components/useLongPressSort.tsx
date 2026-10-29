"use client";

import { useRef, useState } from "react";

const HOLD_MS = 220;

/**
 * Oefeningen verslepen: houd de greep even ingedrukt en sleep omhoog of omlaag.
 * Werkt met vinger, pen en muis; met het toetsenbord verplaatsen pijltjes omhoog/omlaag.
 * Rijen markeren zich met data-sort-key binnen het element met `containerRef`.
 */
export function useLongPressSort<T>(items: T[], keyOf: (t: T) => number, onReorder: (next: T[]) => void) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(items);
  latest.current = items;

  function move(key: number, to: number) {
    const list = [...latest.current];
    const from = list.findIndex((t) => keyOf(t) === key);
    if (from < 0 || to < 0 || to >= list.length || from === to) return;
    const [it] = list.splice(from, 1);
    list.splice(to, 0, it);
    onReorder(list);
  }

  function targetIndex(y: number) {
    const rows = Array.from(containerRef.current?.querySelectorAll<HTMLElement>("[data-sort-key]") ?? []);
    let idx = 0;
    rows.forEach((r, i) => {
      const b = r.getBoundingClientRect();
      if (y > b.top + b.height / 2) idx = i;
    });
    // Boven de eerste rij = positie 0
    if (rows[0] && y < rows[0].getBoundingClientRect().top + rows[0].getBoundingClientRect().height / 2) idx = 0;
    return idx;
  }

  function handleProps(key: number, label: string) {
    return {
      type: "button" as const,
      className: "drag-handle",
      "aria-label": `${label} verplaatsen: houd ingedrukt en sleep, of gebruik de pijltjestoetsen`,
      title: "Houd ingedrukt en sleep",
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        const el = e.currentTarget;
        const id = e.pointerId;
        el.setPointerCapture(id);
        timer.current = setTimeout(() => {
          setDragging(key);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(10);
        }, HOLD_MS);
      },
      onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (dragging !== key) return;
        e.preventDefault();
        move(key, targetIndex(e.clientY));
      },
      onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (timer.current) clearTimeout(timer.current);
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        setDragging(null);
      },
      onPointerCancel: () => {
        if (timer.current) clearTimeout(timer.current);
        setDragging(null);
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(), // geen menu bij lang drukken
      onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
        const i = latest.current.findIndex((t) => keyOf(t) === key);
        if (e.key === "ArrowUp" && i > 0) {
          e.preventDefault();
          move(key, i - 1);
        } else if (e.key === "ArrowDown" && i < latest.current.length - 1) {
          e.preventDefault();
          move(key, i + 1);
        }
      },
    };
  }

  function rowProps(key: number) {
    return { "data-sort-key": key, className: dragging === key ? "is-dragging" : undefined };
  }

  return { containerRef, handleProps, rowProps, dragging };
}

export function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <circle cx="5.5" cy="3.5" r="1.5" /><circle cx="10.5" cy="3.5" r="1.5" />
      <circle cx="5.5" cy="8" r="1.5" /><circle cx="10.5" cy="8" r="1.5" />
      <circle cx="5.5" cy="12.5" r="1.5" /><circle cx="10.5" cy="12.5" r="1.5" />
    </svg>
  );
}
