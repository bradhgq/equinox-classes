import { useEffect, useState } from "preact/hooks";

/**
 * True while an on-screen keyboard covers a big part of the viewport. Used to
 * hide sheet footers so search results get the room (critique H4).
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setOpen(vv.height < window.innerHeight * 0.75);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);
  return open;
}
