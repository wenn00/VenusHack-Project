import { describe, expect, it } from "vitest";
import { AlertButtonLike, BrowserDialogs, showWebAlert } from "./web-alert";

function fakeDialogs(confirmResult = true) {
  const calls: string[] = [];
  const dialogs: BrowserDialogs = {
    alert: (message) => {
      calls.push(`alert:${message}`);
    },
    confirm: (message) => {
      calls.push(`confirm:${message}`);
      return confirmResult;
    },
  };
  return { calls, dialogs };
}

function recorder() {
  const pressed: string[] = [];
  const button = (text: string, style?: AlertButtonLike["style"]): AlertButtonLike => ({
    text,
    style,
    onPress: () => {
      pressed.push(text);
    },
  });
  return { pressed, button };
}

describe("showWebAlert", () => {
  it("shows title and message in a plain alert when there are no buttons", () => {
    const { calls, dialogs } = fakeDialogs();
    showWebAlert("Title", "Message", undefined, dialogs);
    expect(calls).toEqual(["alert:Title\n\nMessage"]);
  });

  it("shows only the title when the message is omitted", () => {
    const { calls, dialogs } = fakeDialogs();
    showWebAlert("Title", undefined, [], dialogs);
    expect(calls).toEqual(["alert:Title"]);
  });

  it("runs a single button's callback after the alert closes", () => {
    // Regression: react-native-web's Alert is a no-op, so log-bp's
    // "Got it" → router.back() never ran and the screen got stuck.
    const { calls, dialogs } = fakeDialogs();
    const { pressed, button } = recorder();
    showWebAlert("Saved", "Reading stored.", [button("Got it")], dialogs);
    expect(calls).toEqual(["alert:Saved\n\nReading stored."]);
    expect(pressed).toEqual(["Got it"]);
  });

  it("runs the action when the user confirms an action + cancel pair", () => {
    const { dialogs } = fakeDialogs(true);
    const { pressed, button } = recorder();
    showWebAlert("No OB number saved", "Call 911?", [button("Call 911"), button("Close", "cancel")], dialogs);
    expect(pressed).toEqual(["Call 911"]);
  });

  it("runs the cancel button when the user dismisses an action + cancel pair", () => {
    const { dialogs } = fakeDialogs(false);
    const { pressed, button } = recorder();
    showWebAlert("No OB number saved", "Call 911?", [button("Call 911"), button("Close", "cancel")], dialogs);
    expect(pressed).toEqual(["Close"]);
  });

  it("finds the action even when the cancel button comes first", () => {
    const { calls, dialogs } = fakeDialogs(true);
    const { pressed, button } = recorder();
    showWebAlert("Open Settings", "Camera denied.", [button("Cancel", "cancel"), button("Open Settings")], dialogs);
    expect(calls).toEqual(["confirm:Open Settings\n\nCamera denied."]);
    expect(pressed).toEqual(["Open Settings"]);
  });

  it("runs the first non-cancel button on confirm when there is no cancel button", () => {
    const { dialogs } = fakeDialogs(true);
    const { pressed, button } = recorder();
    showWebAlert("Choose", undefined, [button("Discard"), button("Keep")], dialogs);
    expect(pressed).toEqual(["Discard"]);
  });

  it("runs nothing when the user dismisses and there is no cancel button", () => {
    const { dialogs } = fakeDialogs(false);
    const { pressed, button } = recorder();
    showWebAlert("Choose", undefined, [button("Discard"), button("Keep")], dialogs);
    expect(pressed).toEqual([]);
  });
});
