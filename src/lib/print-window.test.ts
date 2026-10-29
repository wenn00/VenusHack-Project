import { describe, expect, it } from "vitest";
import { PopupBlockedError, PrintableWindow, printHtmlInNewWindow } from "./print-window";

function fakeWindow() {
  const calls: string[] = [];
  let written = "";
  const win: PrintableWindow = {
    opener: "app-window",
    document: {
      write: (html) => {
        calls.push("write");
        written += html;
      },
      close: () => {
        calls.push("close");
      },
    },
    focus: () => {
      calls.push("focus");
    },
    print: () => {
      calls.push("print");
    },
  };
  return { win, calls, written: () => written };
}

describe("printHtmlInNewWindow", () => {
  it("writes the summary into the new window, then prints it", () => {
    const { win, calls, written } = fakeWindow();
    printHtmlInNewWindow("<h1>Visit summary</h1>", () => win);
    expect(written()).toBe("<h1>Visit summary</h1>");
    expect(calls).toEqual(["write", "close", "focus", "print"]);
  });

  it("detaches the new tab from the app window before writing into it", () => {
    // The tab shares the app's origin; without this, script in the printed
    // document could reach the signed-in app through window.opener.
    const { win } = fakeWindow();
    printHtmlInNewWindow("<p>x</p>", () => win);
    expect(win.opener).toBeNull();
  });

  it("throws PopupBlockedError when the browser refuses to open a window", () => {
    expect(() => printHtmlInNewWindow("<h1>x</h1>", () => null)).toThrow(PopupBlockedError);
  });
});
