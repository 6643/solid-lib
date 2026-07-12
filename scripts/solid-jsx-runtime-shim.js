
import { createComponent } from "./dist/web.js";

export const Fragment = Symbol.for("solid-fragment");

const setClass = (el, value) => {
  if (Array.isArray(value)) {
    el.className = value.flat(Infinity).filter(Boolean).map((entry) => {
      if (entry && typeof entry === "object") {
        return Object.entries(entry).filter(([, on]) => on).map(([name]) => name).join(" ");
      }
      return String(entry);
    }).filter(Boolean).join(" ");
    return;
  }
  if (value && typeof value === "object") {
    el.className = Object.entries(value).filter(([, on]) => on).map(([name]) => name).join(" ");
    return;
  }
  if (value != null) el.className = String(value);
};

const appendChild = (parent, child) => {
  if (child == null || child === false || child === true) return;
  if (Array.isArray(child)) { for (const entry of child) appendChild(parent, entry); return; }
  if (typeof child === "function") { appendChild(parent, child()); return; }
  if (typeof child === "object" && child !== null && "nodeType" in child) { parent.appendChild(child); return; }
  parent.appendChild(document.createTextNode(String(child)));
};

const createHostElement = (type, props) => {
  if (typeof document === "undefined") return { type, props };
  const el = type === Fragment ? document.createDocumentFragment() : document.createElement(type);
  if (!props) return el;
  const { children, ref, ...rest } = props;
  for (const [key, value] of Object.entries(rest)) {
    if (value == null) continue;
    if (key === "class" || key === "className") { if (el instanceof Element) setClass(el, value); continue; }
    if (key === "style" && value && typeof value === "object" && el instanceof HTMLElement) { Object.assign(el.style, value); continue; }
    if (key.startsWith("on") && typeof value === "function" && el instanceof Element) {
      el.addEventListener(key.slice(2).toLowerCase(), value); continue;
    }
    if (el instanceof Element) {
      if (key in el) { try { el[key] = value; continue; } catch {} }
      el.setAttribute(key, String(value));
    }
  }
  if (typeof ref === "function") ref(el);
  appendChild(el, children);
  return el;
};

export function jsx(type, props, key) {
  const nextProps = props ? (key === undefined ? props : { ...props, key }) : (key === undefined ? {} : { key });
  if (typeof type === "function") return createComponent(type, nextProps);
  return createHostElement(type, nextProps);
}
export const jsxs = jsx;
export const jsxDEV = jsx;
