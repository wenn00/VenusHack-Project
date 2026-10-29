import { describe, expect, it } from "vitest";
import { fileNameForMimeType, pickRecorderMimeType } from "./web-recorder";

const supports = (...types: string[]) => (type: string) => types.includes(type);

describe("pickRecorderMimeType", () => {
  it("records MP4, which iOS Safari and current Chrome both support", () => {
    expect(pickRecorderMimeType(supports("video/mp4", "video/webm;codecs=vp8", "video/webm"))).toBe("video/mp4");
  });

  it("refuses WebM-only browsers instead of uploading a mistimed clip", () => {
    // Regression: MediaRecorder WebM declares no average frame rate, so
    // OpenCV reports ~2x the real fps and the backend returned ~143 BPM for
    // a 72 BPM pulse — a false red "contact your OB" alert. Those browsers
    // get the "unsupported" message instead.
    expect(pickRecorderMimeType(supports("video/webm;codecs=vp8", "video/webm"))).toBeNull();
  });

  it("returns null when the browser can record none of them", () => {
    expect(pickRecorderMimeType(supports())).toBeNull();
  });
});

describe("fileNameForMimeType", () => {
  it("names WebM uploads .webm", () => {
    expect(fileNameForMimeType("video/webm;codecs=vp8")).toBe("rppg.webm");
  });

  it("names MP4 uploads .mp4", () => {
    expect(fileNameForMimeType("video/mp4")).toBe("rppg.mp4");
  });
});
