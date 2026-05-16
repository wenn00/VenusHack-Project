/**
 * Community resources — static directory.
 *
 * Cards link out to support communities, crisis lines, education,
 * insurance / grants info, and the self-advocacy script page.
 */

import { Linking } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";

interface Resource {
  title: string;
  description: string;
  cta: string;
  action: () => void;
}

const RESOURCES: Resource[] = [
  {
    title: "Insurance & grants",
    description:
      "Medi-Cal coverage, California-specific maternal health grants, and what home BP monitoring costs.",
    cta: "Explore",
    action: () => Linking.openURL("https://www.dhcs.ca.gov/services/medi-cal"),
  },
  {
    title: "Support communities",
    description:
      "Postpartum Support International, Black Mamas Matter Alliance, Preeclampsia Foundation.",
    cta: "Find a group",
    action: () => Linking.openURL("https://www.postpartum.net"),
  },
  {
    title: "Crisis lines",
    description:
      "24/7 maternal mental health, domestic violence, and nurse hotlines.",
    cta: "Call now",
    action: () => Linking.openURL("tel:1-833-852-6262"),
  },
  {
    title: "Education",
    description:
      "Evidence-based articles, podcasts, and books on preeclampsia, postpartum recovery, heart health.",
    cta: "Browse",
    action: () => Linking.openURL("https://www.preeclampsia.org"),
  },
  {
    title: "Self-advocacy",
    description:
      "Scripts for talking to your provider when you feel dismissed or unheard.",
    cta: "Open scripts",
    action: () => router.push("/(app)/self-advocacy"),
  },
];

export default function CommunityScreen() {
  return (
    <Screen>
      <Heading level={2}>You're not alone</Heading>
      <Body tone="muted">
        Real resources from real organisations — vetted for the things
        you're navigating right now.
      </Body>
      {RESOURCES.map((r) => (
        <Card key={r.title}>
          <Heading level={3}>{r.title}</Heading>
          <Body tone="muted">{r.description}</Body>
          <Button label={r.cta} onPress={r.action} variant="secondary" />
        </Card>
      ))}
    </Screen>
  );
}
