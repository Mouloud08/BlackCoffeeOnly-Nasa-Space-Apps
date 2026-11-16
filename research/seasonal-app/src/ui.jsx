// Small shared UI for version 5: anchored popovers (native Popover API), menus with arrow keys, info buttons.
import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { cx, Icon, IC } from './util.jsx';

// Position a popover under (or above) its trigger, inside the viewport. Fixed positioning; recomputed on open.
function place(trigger, panel, align) {
  if (!trigger || !panel) return;
  const r = trigger.getBoundingClientRect(), pw = panel.offsetWidth, ph = panel.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, m = 8;
  let left = align === 'end' ? r.right - pw : r.left;
  left = Math.max(m, Math.min(vw - pw - m, left));
  let top = r.bottom + 6;
  if (top + ph > vh - m && r.top - 6 - ph > m) top = r.top - 6 - ph;
  top = Math.max(m, Math.min(vh - ph - m, top));
  panel.style.left = Math.round(left) + 'px'; panel.style.top = Math.round(top) + 'px';
}

// Arrow keys move focus among the items marked data-nav inside a container (menus, preset lists).
export function navKeys(e, root) {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
  if (keys.indexOf(e.key) < 0) return;
  const items = [...root.querySelectorAll('[data-nav]:not([disabled])')];
  if (!items.length) return;
  const i = items.indexOf(document.activeElement);
  let j = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
  if (i < 0 && e.key === 'ArrowUp') j = items.length - 1;
  e.preventDefault(); items[j].focus();
}

// A trigger button and its popover panel. `menu` focuses the first item on open.
export function Pop({ id, label, ariaLabel, btnClass, panelClass, align = 'start', menu = false, children, title, disabled, onOpenChange, triggerRef }) {
  const tRef = useRef(null), pRef = useRef(null);
  const [open, setOpen] = useState(false);
  const setT = (el) => { tRef.current = el; if (triggerRef) triggerRef.current = el; };
  useEffect(() => {
    const p = pRef.current; if (!p) return undefined;
    const on = (e) => {
      const isOpen = e.newState === 'open';
      setOpen(isOpen); onOpenChange && onOpenChange(isOpen);
      if (isOpen) place(tRef.current, p, align);
      else if (p.contains(document.activeElement) || document.activeElement === document.body) tRef.current && tRef.current.focus({ preventScroll: true });
    };
    p.addEventListener('toggle', on);
    const re = () => { if (p.matches(':popover-open')) place(tRef.current, p, align); };
    window.addEventListener('resize', re);
    return () => { p.removeEventListener('toggle', on); window.removeEventListener('resize', re); };
  }, [align, menu]);
  useLayoutEffect(() => { const p = pRef.current; if (open && p) place(tRef.current, p, align); });
  // Focus the first item once the content has rendered (children render only while open).
  useLayoutEffect(() => {
    const p = pRef.current; if (!open || !p) return;
    const first = p.querySelector(menu ? '[data-nav][aria-checked="true"], [data-nav]:not([disabled])' : '[data-autofocus], button, input, select');
    first && first.focus({ preventScroll: true });
  }, [open]);
  return (
    <>
      <button type="button" ref={setT} className={btnClass} aria-haspopup={menu ? 'menu' : 'dialog'} aria-expanded={open} aria-controls={id} aria-label={ariaLabel} title={title} disabled={disabled}
        onClick={() => { const p = pRef.current; if (p) p.togglePopover(); }}>{label}</button>
      <div id={id} popover="auto" ref={pRef} className={cx('fb-pop', panelClass)} role={menu ? 'menu' : 'dialog'} aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
        onKeyDown={(e) => menu && navKeys(e, pRef.current)}>
        {open ? (typeof children === 'function' ? children(() => pRef.current && pRef.current.hidePopover()) : children) : null}
      </div>
    </>
  );
}

// (i): a small info button with its popover of notes.
export function Info({ id, label = 'Details', children, align = 'end' }) {
  return (
    <Pop id={id} ariaLabel={label} align={align} btnClass="fb-info" panelClass="fb-pop-note" label={<Icon d="M12 8.2v.1M12 11v5.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />}>
      {children}
    </Pop>
  );
}

// Run a state change inside a View Transition when allowed (reduced motion and anim=0: instant).
export function useTransitionRunner(flushSync, reducedFn) {
  return useCallback((fn, kind) => {
    if (reducedFn() || typeof document.startViewTransition !== 'function') { fn(); return; }
    document.documentElement.dataset.vt = kind || 'fade';
    const t = document.startViewTransition(() => flushSync(fn));
    t.finished.finally(() => { delete document.documentElement.dataset.vt; });
  }, []);
}
