/**
 * Print an HTML document from a new browser tab.
 *
 * expo-print has no real web implementation: its printToFileAsync just
 * calls window.print() on the app page and returns undefined. On web the
 * doctor summary is instead written into a fresh tab and printed there,
 * where the browser offers "Save as PDF" / share.
 *
 * The window must be opened synchronously inside the user's tap — Safari
 * blocks pop-ups opened after an await.
 */

export class PopupBlockedError extends Error {
  constructor() {
    super("The browser blocked the summary window.");
    this.name = "PopupBlockedError";
  }
}

export interface PrintableWindow {
  opener: unknown;
  document: { write(html: string): void; close(): void };
  focus(): void;
  print(): void;
}

export function printHtmlInNewWindow(html: string, openWindow: () => PrintableWindow | null): void {
  const win = openWindow();
  if (!win) throw new PopupBlockedError();
  // Same-origin tab: cut the link back to the signed-in app before writing.
  win.opener = null;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
