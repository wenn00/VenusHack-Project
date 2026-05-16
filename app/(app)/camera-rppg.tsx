/**
 * rPPG camera screen — placeholder.
 *
 * Will record 20 seconds of front-camera video and POST it to the
 * Python rPPG service, then route the result to KPIN.
 */

import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";

export default function CameraRppgScreen() {
  return (
    <Screen>
      <Heading level={2}>Measure heart rate</Heading>
      <Card>
        <Body>
          Hold your phone at eye level, keep your face inside the circle,
          and stay still for 20 seconds.
        </Body>
      </Card>
      <Card>
        <Heading level={3}>Camera placeholder</Heading>
        <Body tone="muted">
          expo-camera live preview will appear here. Once the recording
          finishes, the video uploads to the rPPG backend and we display
          the BPM + HRV result.
        </Body>
      </Card>
      <Body tone="muted" size="sm">
        Estimated values. For reference only — not a clinical device.
      </Body>
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
