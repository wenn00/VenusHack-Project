import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { useUserData } from "@/contexts/UserDataContext";
import { colors, spacing, typography } from "@/theme";

export default function DashboardScreen() {
  const { profile } = useUserData();
  const firstName = profile?.fullName?.split(" ")[0] || "Sahana";
  const weeks = getPregnancyWeeks(profile?.dueDate);
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Screen contentStyle={styles.screen}>
      <Text style={styles.brand}>Kairos</Text>

      <Text style={styles.greeting}>
        {getDayGreeting()}, {firstName}.{"\n"}We're here whenever{"\n"}you're ready.
      </Text>

      <View style={styles.datePill}>
        <Text style={styles.dateText}>{today}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your condition</Text>
        <View style={styles.conditionCard}>
          <View>
            <Text style={styles.weekNumber}>{weeks}</Text>
            <Text style={styles.weekLabel}>weeks</Text>
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
  return (
    <Svg width={220} height={160} viewBox="0 0 220 160" style={styles.illustration}>
      <Circle cx={145} cy={48} r={25} fill="white" opacity={0.98} />
      <Circle cx={171} cy={39} r={18} fill="white" opacity={0.98} />
      <Circle cx={122} cy={56} r={21} fill="white" opacity={0.98} />
      <Circle cx={150} cy={66} r={14} fill="#2A6EEB" stroke="white" strokeWidth={3} />
      <Circle cx={134} cy={64} r={11} fill="#2A6EEB" stroke="white" strokeWidth={3} />
      <Circle cx={166} cy={64} r={11} fill="#2A6EEB" stroke="white" strokeWidth={3} />
      <Path d="M142 77 C138 86 140 96 151 102" stroke="white" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M151 102 C178 107 190 128 187 151" stroke="white" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M135 88 C101 97 85 119 88 151" stroke="white" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M114 123 C111 136 120 144 134 146" stroke="white" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Line x1={42} y1={146} x2={213} y2={136} stroke="white" strokeWidth={3} strokeLinecap="round" />
      <Rect x={118} y={125} width={25} height={25} stroke="white" strokeWidth={2} fill="none" />
      <Path d="M118 125 L131 118 L143 125" stroke="white" strokeWidth={2} fill="none" />
      <Line x1={131} y1={118} x2={131} y2={143} stroke="white" strokeWidth={2} />
      <Rect x={165} y={119} width={22} height={29} stroke="white" strokeWidth={2} fill="none" />
      <Path d="M165 119 L179 112 L187 119" stroke="white" strokeWidth={2} fill="none" />
      <Rect x={194} y={111} width={20} height={27} stroke="white" strokeWidth={2} fill="none" />
      <Path d="M194 111 L207 104 L214 111" stroke="white" strokeWidth={2} fill="none" />
    </Svg>
  );
}

function getPregnancyWeeks(dueDate: string | null | undefined): number {
  if (!dueDate) return 16;

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 16;

  const daysUntilDue = (due.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  const weeks = Math.round(40 - daysUntilDue / 7);
  return Math.min(40, Math.max(1, weeks));
}

function getDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

const styles = StyleSheet.create({
  screen: {
    minHeight: 956,
    paddingHorizontal: 32,
    paddingTop: 62,
    paddingBottom: 128,
  },
  brand: {
    alignSelf: "center",
    color: colors.fg.primary,
    fontFamily: typography.family.brand,
    fontSize: 40,
    lineHeight: 50,
  },
  greeting: {
    marginTop: 76,
    color: colors.fg.primary,
    fontSize: 48,
    lineHeight: 60,
    fontWeight: "300",
  },
  datePill: {
    alignSelf: "flex-start",
    marginTop: 30,
    minHeight: 60,
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.strong,
    paddingHorizontal: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  dateText: {
    color: colors.fg.primary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
  },
  section: {
    marginTop: 70,
    gap: 24,
  },
  sectionTitle: {
    color: colors.fg.primary,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "400",
  },
  conditionCard: {
    minHeight: 228,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.bg.card,
    paddingHorizontal: 32,
    paddingVertical: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  weekNumber: {
    color: colors.fg.primary,
    fontSize: 96,
    lineHeight: 104,
    fontWeight: "300",
  },
  weekLabel: {
    marginLeft: 20,
    color: colors.fg.primary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "400",
  },
  illustration: {
    marginRight: -18,
    marginBottom: -18,
  },
  actionRow: {
    marginTop: 24,
    flexDirection: "row",
    gap: 20,
  },
  actionCard: {
    flex: 1,
    minHeight: 246,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
    paddingHorizontal: 32,
    paddingTop: 34,
    paddingBottom: 26,
  },
  cardPressed: {
    backgroundColor: colors.bg.muted,
  },
  actionLabel: {
    color: colors.fg.primary,
    fontSize: 28,
    lineHeight: 40,
    fontWeight: "400",
  },
  plusButton: {
    position: "absolute",
    right: 32,
    bottom: 32,
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  plus: {
    color: colors.fg.primary,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "300",
  },
});
