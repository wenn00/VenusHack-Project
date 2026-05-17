import React, { useState, useMemo, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from "date-fns";
import { Body } from "@/components/ui/Body";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { colors, spacing, radius } from "@/theme";
import { useUserData } from "@/contexts/UserDataContext";
import { supabase } from "@/services/supabase";

/**
 * Health Log — iOS Calendar Design.
 *
 * Features:
 * - Top half: Calendar view with status dots.
 * - Bottom half: Detail rows for Heart Data, Voice Logs, and Mood.
 * - Modal detail views for each category with real/mocked data.
 */
export default function HealthLogScreen() {
  const { recentBp, recentMood } = useUserData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [detailView, setDetailView] = useState<"heart" | "voice" | "mood" | null>(null);

  // Voice logs for the selected day
  const [voiceLogs, setVoiceLogs] = useState<any[]>([]);

  // --- Calendar Logic ---
  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // --- Data Filtering ---
  const dayBp = useMemo(() =>
    recentBp.filter(bp => isSameDay(new Date(bp.measuredAt), selectedDate)),
  [recentBp, selectedDate]);

  const dayMood = useMemo(() =>
    recentMood.filter(m => isSameDay(new Date(m.loggedAt), selectedDate)),
  [recentMood, selectedDate]);

  useEffect(() => {
    async function fetchVoiceLogs() {
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from("voice_journal_entries")
        .select("*")
        .gte("recorded_at", start.toISOString())
        .lte("recorded_at", end.toISOString());

      setVoiceLogs(data || []);
    }
    fetchVoiceLogs();
  }, [selectedDate]);

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      {/* --- Calendar Section (Top Half) --- */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Heading level={3}>{format(currentMonth, "MMMM yyyy")}</Heading>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={prevMonth} style={styles.chevron}>
              <Ionicons name="chevron-back" size={24} color={colors.accent.rose} />
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={styles.chevron}>
              <Ionicons name="chevron-forward" size={24} color={colors.accent.rose} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekDaysRow}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <Body key={i} size="sm" tone="muted" style={styles.weekDayText}>{d}</Body>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {daysInMonth.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const today = isToday(day);

            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayCell, isSelected && styles.selectedDay]}
                onPress={() => setSelectedDate(day)}
              >
                <Body
                  style={[
                    styles.dayText,
                    isSelected && styles.selectedDayText,
                    !isCurrentMonth && styles.otherMonthText,
                    today && !isSelected && { color: colors.accent.rose, fontWeight: "bold" }
                  ]}
                >
                  {format(day, "d")}
                </Body>
                <View style={styles.dotsRow}>
                  {recentBp.some(bp => isSameDay(new Date(bp.measuredAt), day)) && <View style={styles.dot} />}
                  {recentMood.some(m => isSameDay(new Date(m.loggedAt), day)) && <View style={[styles.dot, { backgroundColor: colors.status.yellow }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* --- Detail Rows Section (Bottom Half) --- */}
      <View style={styles.detailsContainer}>
        <Heading level={3} style={styles.detailsTitle}>
          {isToday(selectedDate) ? "Today's Log" : format(selectedDate, "EEEE, MMMM do")}
        </Heading>

        <ScrollView contentContainerStyle={styles.rowsContent}>
          <TouchableOpacity style={styles.detailRow} onPress={() => setDetailView("heart")}>
            <View style={[styles.iconBox, { backgroundColor: colors.status.redBg }]}>
              <Ionicons name="heart" size={22} color={colors.status.red} />
            </View>
            <View style={styles.rowInfo}>
              <Body style={styles.rowLabel}>Heart Data & Vitals</Body>
              <Body size="sm" tone="muted">
                {dayBp.length > 0 ? `${dayBp[0].systolic}/${dayBp[0].diastolic} mmHg` : "No vitals logged"}
              </Body>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.border.strong} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.detailRow} onPress={() => setDetailView("voice")}>
            <View style={[styles.iconBox, { backgroundColor: colors.accent.roseLight }]}>
              <Ionicons name="mic" size={22} color={colors.accent.rose} />
            </View>
            <View style={styles.rowInfo}>
              <Body style={styles.rowLabel}>Voice Journal</Body>
              <Body size="sm" tone="muted">
                {voiceLogs.length > 0 ? `${voiceLogs.length} entries` : "No voice logs"}
              </Body>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.border.strong} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.detailRow} onPress={() => setDetailView("mood")}>
            <View style={[styles.iconBox, { backgroundColor: colors.status.yellowBg }]}>
              <Ionicons name="happy" size={22} color={colors.status.yellow} />
            </View>
            <View style={styles.rowInfo}>
              <Body style={styles.rowLabel}>Mood Check-in</Body>
              <Body size="sm" tone="muted">
                {dayMood.length > 0 ? `Logged as ${dayMood[0].mood}` : "No mood logged"}
              </Body>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.border.strong} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* --- Detail Modal --- */}
      <Modal visible={!!detailView} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Heading level={2}>{detailView === 'heart' ? 'Vitals' : detailView === 'voice' ? 'Voice Journal' : 'Mood'}</Heading>
            <TouchableOpacity onPress={() => setDetailView(null)}>
              <Ionicons name="close-circle" size={32} color={colors.fg.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Body tone="muted" style={{ marginBottom: spacing.lg }}>{format(selectedDate, "PPPP")}</Body>

            {detailView === "heart" && (
              <View style={styles.modalList}>
                {dayBp.length > 0 ? dayBp.map(bp => (
                  <Card key={bp.id} style={styles.dataCard}>
                    <Heading level={3}>{bp.systolic}/{bp.diastolic}</Heading>
                    <Body size="sm" tone="muted">Blood Pressure · {format(new Date(bp.measuredAt), "p")}</Body>
                    {bp.pulse && <Body size="sm">Pulse: {bp.pulse} bpm</Body>}
                  </Card>
                )) : (
                  <Body tone="muted">No heart data logged for this day.</Body>
                )}
              </View>
            )}

            {detailView === "voice" && (
              <View style={styles.modalList}>
                {voiceLogs.length > 0 ? voiceLogs.map(log => (
                  <Card key={log.id} style={styles.dataCard}>
                    <Body style={styles.transcriptText}>"{log.raw_transcript}"</Body>
                    <Body size="sm" tone="muted" style={{ marginTop: spacing.xs }}>
                      Recorded at {format(new Date(log.recorded_at), "p")}
                    </Body>
                  </Card>
                )) : (
                  <Body tone="muted">No voice journals for this day.</Body>
                )}
              </View>
            )}

            {detailView === "mood" && (
              <View style={styles.modalList}>
                {dayMood.length > 0 ? dayMood.map(m => (
                  <Card key={m.id} style={styles.dataCard}>
                    <Heading level={3} style={{ textTransform: 'capitalize' }}>{m.mood}</Heading>
                    {m.note && <Body style={{ marginTop: spacing.xs }}>{m.note}</Body>}
                    <Body size="sm" tone="muted" style={{ marginTop: spacing.xs }}>
                      Logged at {format(new Date(m.loggedAt), "p")}
                    </Body>
                  </Card>
                )) : (
                  <Body tone="muted">No mood entries for this day.</Body>
                )}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailView(null)}>
            <Body style={{ color: "white", fontWeight: "600" }}>Done</Body>
          </TouchableOpacity>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
  },
  calendarContainer: {
    backgroundColor: colors.bg.card,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chevron: {
    padding: spacing.xs,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  weekDayText: {
    width: 40,
    textAlign: "center",
    fontWeight: "600",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayCell: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  selectedDay: {
    backgroundColor: colors.accent.rose,
    borderRadius: radius.full,
  },
  dayText: {
    fontSize: 16,
    color: colors.fg.primary,
  },
  selectedDayText: {
    color: "white",
    fontWeight: "bold",
  },
  otherMonthText: {
    color: colors.border.strong,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    height: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.status.red,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  detailsTitle: {
    marginBottom: spacing.md,
  },
  rowsContent: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  rowInfo: {
    flex: 1,
  },
  rowLabel: {
    fontWeight: "600",
    color: colors.fg.primary,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.bg.page,
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalList: {
    gap: spacing.md,
  },
  dataCard: {
    padding: spacing.md,
  },
  transcriptText: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
  closeBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent.rose,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  }
});
