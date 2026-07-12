/**
 * Safe wrappers around Linking for the alert/emergency flows.
 *
 * Every openURL promise is handled: on iOS an unsupported or empty URL
 * rejects, and an unhandled rejection here means an emergency button that
 * silently does nothing — the exact failure this module exists to prevent.
 */

import { Alert, Linking, Platform } from "react-native";

export async function openUrlSafely(url: string, failureMessage?: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Couldn't open",
      failureMessage ?? "This action isn't available on your device.",
    );
  }
}

/**
 * The data model does not store an OB phone number yet. Until it does,
 * pressing "Call my OB" must never fail silently: explain the situation
 * and offer 911 as the urgent fallback.
 */
export function callOb(obPhone?: string | null): void {
  if (obPhone) {
    void openUrlSafely(`tel:${obPhone}`, "Couldn't start the call. Please dial manually.");
    return;
  }
  Alert.alert(
    "No OB number saved",
    "Kairos doesn't have your OB's phone number yet. If this is urgent, call 911 or dial your OB from your contacts.",
    [
      { text: "Call 911", onPress: () => void openUrlSafely("tel:911") },
      { text: "Close", style: "cancel" },
    ],
  );
}

/** Platform-appropriate "nearest emergency room" maps link. */
export function openNearestErDirections(): void {
  const url = Platform.select({
    ios: "https://maps.apple.com/?q=emergency+room",
    default: "geo:0,0?q=emergency+room",
  });
  void openUrlSafely(url, "Couldn't open maps. Please search for the nearest ER manually.");
}
