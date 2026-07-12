import { describe, expect, it } from "vitest";
import { fillTemplate, VOICE_JOURNAL_PROMPT } from "./prompts";

describe("fillTemplate", () => {
  it("substitutes the placeholder", () => {
    expect(fillTemplate("Hello {name}!", "{name}", "world")).toBe("Hello world!");
  });

  it("inserts $-sequences literally instead of as replacement patterns", () => {
    // String.replace with a string replacement interprets $`, $', $& and $$.
    // A dictated transcript like "I paid $` for the copay" previously
    // duplicated the entire preceding template text into the prompt.
    expect(fillTemplate("A {t} B", "{t}", "$` and $' and $& and $$")).toBe(
      "A $` and $' and $& and $$ B",
    );
  });

  it("fills the real voice-journal prompt without corruption", () => {
    const transcript = "I paid $` for the copay and my head hurts";
    const prompt = fillTemplate(VOICE_JOURNAL_PROMPT, "{transcript}", transcript);
    expect(prompt).toContain(transcript);
    expect(prompt.indexOf("Transcript:")).toBe(prompt.lastIndexOf("Transcript:"));
  });
});
