import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { Screen } from "@/components/ui/Screen";
import { useUserData } from "@/contexts/UserDataContext";
import { getDashboardCondition } from "@/lib/dashboard-condition";
import { colors, spacing } from "@/theme";

export default function DashboardScreen() {
  const { profile, kpinLevel, baselineEvaluation } = useUserData();
  const firstName = profile?.fullName?.split(" ")[0];
  const riskColor =
    kpinLevel === "red"
      ? colors.status.red
      : kpinLevel === "yellow"
        ? colors.status.yellow
        : colors.status.green;
  const condition = getDashboardCondition(profile);
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Screen contentStyle={styles.screen} header={<BrandHeader />}>
      <Text style={styles.greeting}>
        {getDayGreeting()}
        {firstName ? `, ${firstName}` : ""}.{"\n"}{"We're here whenever you're ready."}
      </Text>

      <View style={styles.datePill}>
        <Text style={styles.dateText}>{today}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your condition</Text>
        <View style={styles.conditionCard}>
          <View style={styles.conditionText}>
            <Text style={condition.numeric ? styles.weekNumber : styles.stageName}>{condition.value}</Text>
            <Text style={styles.weekLabel}>{condition.label}</Text>
            <Text style={styles.conditionDetail}>{condition.detail}</Text>
          </View>
          <PregnancyIllustration />
        </View>
      </View>

      <View style={styles.actionRow}>
        <HomeActionCard
          label={"Log how\nyou're feeling"}
          onPress={() => router.push("/(app)/log-mood")}
        />
        <HomeActionCard
          label={"Record your\nvitals"}
          onPress={() => router.push("/(app)/log-bp")}
        />
      </View>
      {baselineEvaluation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk status</Text>
          <View style={styles.riskCard}>
            <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
            <View style={styles.riskText}>
              <Text style={styles.riskMessage}>{baselineEvaluation.message}</Text>
              <Text style={styles.riskDetail}>{baselineEvaluation.detail}</Text>
            </View>
          </View>
        </View>
      )}

    </Screen>
  );
}

function HomeActionCard({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, style, pressed && styles.cardPressed]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
      <View style={styles.plusButton}>
        <Text style={styles.plus}>+</Text>
      </View>
    </Pressable>
  );
}

function PregnancyIllustration() {
  return <Image source={require("../../assets/figma/condition-illustration.png")} accessible={false} resizeMode="contain" style={styles.illustration} />;
}

function getDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 96,
  },
  greeting: {
    color: colors.fg.primary,
    fontSize: 34,
    lineHeight: 44,
    fontWeight: "400",
  },
  datePill: {
    alignSelf: "flex-start",
    marginTop: 0,
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  dateText: {
    color: colors.fg.primary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  section: {
    marginTop: 28,
    gap: 16,
  },
  sectionTitle: {
    color: colors.fg.primary,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "400",
  },
  conditionCard: {
    minHeight: 156,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  weekNumber: {
    color: colors.fg.primary,
    fontSize: 72,
    lineHeight: 78,
    fontWeight: "300",
  },
  weekLabel: {
    marginLeft: 0,
    color: colors.fg.primary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "400",
  },
  illustration: { width: 142, height: 104, flexShrink: 1, marginLeft: 8 },
  conditionText: { flex: 1, minWidth: 0 },
  stageName: { color: colors.fg.primary, fontSize: 25, lineHeight: 34, fontWeight: "500" },
  conditionDetail: { color: colors.fg.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  riskCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  riskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  riskText: {
    flex: 1,
    gap: 4,
  },
  riskMessage: {
    color: colors.fg.primary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  riskDetail: {
    color: colors.fg.primary,
    opacity: 0.75,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 16,
  },
  actionCard: {
    flex: 1,
    minHeight: 168,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 24,
  },
  cardPressed: {
    backgroundColor: colors.bg.muted,
  },
  actionLabel: {
    color: colors.fg.primary,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "400",
  },
  plusButton: {
    alignSelf: "flex-end",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  plus: {
    color: colors.fg.primary,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "300",
  },
});
