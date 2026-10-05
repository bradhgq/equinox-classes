/**
 * iOS raises the on-screen keyboard only when focus moves inside the tap's own handler. The
 * search field lives in a sheet that mounts after the tap, so focus a stand-in input right now;
 * when the sheet focuses the real field, iOS keeps the keyboard up (critique r6 H3).
 * Phones and tablets only. The stand-in removes itself once focus leaves it.
 */
export function primeKeyboard(): void {
  if (!matchMedia("(pointer: coarse)").matches) return;
  const proxy = document.createElement("input");
  proxy.setAttribute("aria-hidden", "true");
  proxy.tabIndex = -1;
  // 16 px so iOS doesn't zoom; invisible and out of the way.
  proxy.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0;";
  document.body.append(proxy);
  proxy.focus({ preventScroll: true });
  proxy.addEventListener("blur", () => proxy.remove(), { once: true });
  setTimeout(() => proxy.remove(), 3000);
}
