// Reference counted so closing one of several dialogs cannot unlock the page.
let locks = 0;
let restore: (() => void) | undefined;

export function lockModalScroll() {
  if (locks++ === 0) {
    const body = document.body;
    const root = document.documentElement;
    const x = window.scrollX;
    const y = window.scrollY;
    const keys = ["position", "top", "left", "width", "paddingRight"] as const;
    const saved = keys.map((key) => [key, body.style[key]] as const);
    const overflow = root.style.overflow;
    const gap = window.innerWidth - root.clientWidth;
    const padding = getComputedStyle(body).paddingRight;
    root.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `${-y}px`;
    body.style.left = `${-x}px`;
    body.style.width = "100%";
    if (gap > 0) body.style.paddingRight = `calc(${padding} + ${gap}px)`;
    restore = () => {
      for (const [key, value] of saved) body.style[key] = value;
      root.style.overflow = overflow;
      window.scrollTo({ left: x, top: y, behavior: "instant" });
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) {
      restore?.();
      restore = undefined;
    }
  };
}
