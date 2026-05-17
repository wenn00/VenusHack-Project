import { router } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
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
    <Screen contentStyle={styles.screen} fixedOverlay={<StickyLogoHeader />}>
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

function StickyLogoHeader() {
  return (
    <View style={[styles.logoHeader, Platform.OS === "web" && webBackdropBlurStyle]}>
      <Text style={styles.brand}>Kairos</Text>
    </View>
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
    <Svg width={166} height={122} viewBox="0 0 220 160" style={styles.illustration}>
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

const webBackdropBlurStyle = {
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  maskImage: "linear-gradient(to bottom, black 0%, black 54%, transparent 100%)",
  WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 54%, transparent 100%)",
} as ViewStyle;

const styles = StyleSheet.create({
  screen: {
    minHeight: 812,
    paddingHorizontal: 30,
    paddingTop: 150,
    paddingBottom: 96,
  },
  logoHeader: {
    position: "absolute",
    top: 28,
    left: 0,
    right: 0,
    height: 72,
    zIndex: 12,
    elevation: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(23, 80, 172, 0.18)",
  },
  brand: {
    alignSelf: "center",
    color: colors.fg.primary,
    fontFamily: typography.family.brand,
    fontSize: 26,
    lineHeight: 34,
  },
  greeting: {
    color: colors.fg.primary,
    fontSize: 34,
    lineHeight: 44,
    fontWeight: "300",
  },
  datePill: {
    alignSelf: "flex-start",
    marginTop: 24,
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.strong,
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
    marginTop: 50,
    gap: 18,
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
    borderColor: colors.border.strong,
    backgroundColor: colors.bg.card,
    paddingHorizontal: 26,
    paddingVertical: 24,
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
    marginLeft: 14,
    color: colors.fg.primary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "400",
  },
  illustration: {
    marginRight: -12,
    marginBottom: -10,
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
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
  },
  cardPressed: {
    backgroundColor: colors.bg.muted,
  },
  actionLabel: {
    color: colors.fg.primary,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: "400",
  },
  plusButton: {
    position: "absolute",
    right: 22,
    bottom: 22,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.strong,
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
