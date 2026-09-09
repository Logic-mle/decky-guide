// Browser-only stand-ins for Steam components. These do not emulate Steam focus navigation.
import { forwardRef, useEffect, useRef, cloneElement } from 'react';
import { createRoot } from 'react-dom/client';
export const NavEntryPositionPreferences = { PREFERRED_CHILD:4 };
export const GamepadButton = { OK:1, CANCEL:2, SECONDARY:3, OPTIONS:4, BUMPER_LEFT:5, BUMPER_RIGHT:6, DIR_UP:9, DIR_DOWN:10, DIR_LEFT:11, DIR_RIGHT:12 };
export const Focusable = forwardRef(function Focusable(props: any, ref: any) {
  const local = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = local.current!;
    const handle = (event: any) => {
      if (event.detail.release) { props.onButtonUp?.(event); return; }
      if (event.detail.button === 2 && props.onCancel) props.onCancel(event);
      else if (event.detail.button >= 9 && event.detail.button <= 12) props.onGamepadDirection?.(event);
      else if (event.detail.button === 1) props.onActivate?.(event);
      else props.onButtonDown?.(event);
    };
    node.addEventListener('test-gamepad', handle);
    return () => node.removeEventListener('test-gamepad', handle);
  });
  const allowed = Object.fromEntries(Object.entries(props).filter(([key]) => ['flow-children','role','tabIndex','className','style','title','onScroll','onWheel','onTouchStart','onPointerDown','onKeyDown'].includes(key) || key.startsWith('aria-')));
  return <div {...allowed} ref={(node) => { local.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
    onClick={(event) => { if (event.target === event.currentTarget || props.role === 'button') props.onActivate?.(event); }}
    onKeyDown={(event) => { props.onKeyDown?.(event); if (event.key === 'Enter') { event.stopPropagation(); props.onActivate?.(event); } }}>
    {props.children}
  </div>;
});
export const PanelSection = ({ children }: any) => <section>{children}</section>;
export const TextField = ({ label, value, onChange }: any) => <label style={{ display:'block', fontSize:12 }}>{label}<input aria-label={label} value={value} onChange={onChange} style={{ boxSizing:'border-box', width:'100%', background:'#101a24', color:'white', border:'1px solid #526476', borderRadius:6, padding:'9px 10px', marginTop:4, fontSize:14 }} /></label>;
export const Spinner = () => <span>◌</span>;
export const Navigation = { NavigateToExternalWeb() {} };
export const DialogButton = ({ children, onClick, style }: any) => <button style={style} onClick={onClick}>{children}</button>;
export const ModalRoot = ({ children, onCancel }: any) => <div role="dialog" onKeyDown={(event) => { if (event.key === 'Escape') onCancel?.(); }}>{children}</div>;
export function showModal(element: any) {
  const host = document.createElement('div');
  Object.assign(host.style, { position:'fixed', inset:'0', background:'#000d', display:'grid', placeItems:'center', zIndex:'20' });
  document.body.append(host);
  const root = createRoot(host);
  const close = () => { root.unmount(); host.remove(); };
  root.render(cloneElement(element, { closeModal:close }));
  return { Close:close };
}
