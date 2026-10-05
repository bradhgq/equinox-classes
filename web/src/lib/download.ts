// Browser-only: save generated text (the .ics reminder) as a file.
export function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Apple platforms open .ics files straight into Calendar (iPadOS reports "Macintosh"). */
export const isApplePlatform = (): boolean => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
