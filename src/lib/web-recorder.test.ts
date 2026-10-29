import { describe, expect, it } from "vitest";
import { fileNameForMimeType, pickRecorderMimeType } from "./web-recorder";

const supports = (...types: string[]) => (type: string) => types.includes(type);

describe("pickRecorderMimeType", () => {
  it("prefers MP4 so iOS Safari uploads H.264 the backend already handles", () => {
    expect(pickRecorderMimeType(supports("video/mp4", "video/webm;codecs=vp8", "video/webm"))).toBe("video/mp4");
  });

  it("falls back to VP8 WebM on browsers without MP4 recording", () => {
    expect(pickRecorderMimeType(supports("video/webm;codecs=vp8", "video/webm"))).toBe("video/webm;codecs=vp8");
  });

  it("accepts plain WebM as a last resort", () => {
    expect(pickRecorderMimeType(supports("video/webm"))).toBe("video/webm");
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
