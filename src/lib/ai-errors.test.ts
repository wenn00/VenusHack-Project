import { describe, expect, it } from "vitest";
import { userFacingAiMessage } from "./ai-errors";

describe("userFacingAiMessage", () => {
  it("keeps the email sign-in hint for anonymous sessions outside the demo", () => {
    expect(userFacingAiMessage("anonymous_not_allowed")).toBe(
      "AI features need an email sign-in. Sign out and sign in with your email to use them.",
    );
  });

  it("explains that the demo's AI has closed", () => {
    expect(userFacingAiMessage("demo_closed")).toBe("The demo's AI is closed now. Thanks for trying Kairos!");
  });

  it("explains that the visitor used up their demo AI calls", () => {
    expect(userFacingAiMessage("demo_quota_exhausted")).toBe(
      "You've reached the demo's AI limit. Thanks for trying Kairos!",
    );
  });

  it("asks the user to retry when the AI gateway is busy", () => {
    expect(userFacingAiMessage("ai_busy")).toBe("The AI is busy right now. Please try again in a moment.");
  });

  it("returns null for internal failures whose detail must stay hidden", () => {
    expect(userFacingAiMessage("upstream_error")).toBeNull();
  });
});
