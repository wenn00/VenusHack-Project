import { useCallback, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { Mood } from "@/types";
import { colors, radius, typography } from "@/theme";

const OPTIONS: { mood: Mood; label: string; color: string; message: string; x: number; y: number }[] = [
  { mood: "great", label: "Great", color: "#FED986", message: "Glad to see it", x: 0.5, y: 0 },
  { mood: "good", label: "Good", color: "#95CDF1", message: "Enjoy this moment", x: 0, y: 0.32 },
  { mood: "okay", label: "Okay", color: "#878EF1", message: "It's okay to just be", x: 1, y: 0.32 },
  { mood: "low", label: "Low", color: "#FFC78D", message: "Take it gently", x: 0.21, y: 0.74 },
  { mood: "bad", label: "Struggling", color: "#FE8C6D", message: "You don't have to carry it alone", x: 0.83, y: 0.74 },
];

/** Motion stays off until accessibility preferences are known. */
function useMoodMotion() {
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(typeof document === "undefined" || !document.hidden);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  useEffect(() => {
    let mounted = true;
    let changed = false;
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", value => {
      changed = true;
      setReduced(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted && !changed) setReduced(value);
    }).catch(() => { /* Keep the accessible static fallback. */ });
    const activity = AppState.addEventListener("change", state => setActive(state === "active"));
    const visibility = () => setVisible(!document.hidden);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted = false;
      motion.remove();
      activity.remove();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return !reduced && active && focused && visible;
}

interface Props {
  firstName?: string;
  isSaving: boolean;
  error: string | null;
  onSave: (mood: Mood, note: string) => void;
}

/** Figma's five luminous emotions, with optional motion layered over a static layout. */
export function MoodTracker({ firstName, isSaving, error, onSave }: Props) {
  const [selected, setSelected] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [returningToChoices, setReturningToChoices] = useState(false);
  const motion = useMoodMotion();
  const { width } = useWindowDimensions();
  const clusterWidth = Math.min(334, Math.max(220, width - 64));
  const orbSize = clusterWidth * (86.4 / 334);
  const option = OPTIONS.find(item => item.mood === selected);
  const [panel] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(panel, {
      toValue: selected ? 1 : 0,
      duration: motion ? 600 : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) setReturningToChoices(false);
    });
    return () => animation.stop();
  }, [selected, motion, panel]);

  return (
    <View style={styles.content}>
      <Text style={styles.brand}>Kairos</Text>
      <View style={styles.heading} accessibilityLiveRegion="polite">
        <Text style={styles.title}>
          {option ? `${option.message}${firstName ? `,\n${firstName}` : "."}` : "How do you feel\ntoday?"}
        </Text>
        <Text style={styles.subtitle}>{option ? "A little space for how you feel." : "Take a breath. Choose what feels closest."}</Text>
      </View>

      <Animated.View style={[styles.cluster, { width: clusterWidth, height: panel.interpolate({ inputRange: [0, 1], outputRange: [clusterWidth + 38, 218] }) }]}>
        {OPTIONS.map((item, index) => (
          <MoodOrb key={item.mood} item={item} index={index} size={orbSize} width={clusterWidth}
            motion={motion} selected={selected} disabled={isSaving || returningToChoices} onSelect={() => {
              Keyboard.dismiss();
              setSelected(item.mood);
            }} />
        ))}
      </Animated.View>

      {selected && (
        <Animated.View style={[styles.notes, {
          opacity: panel,
          transform: [{ translateY: panel.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}>
          <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setReturningToChoices(motion); setSelected(null); }}
            disabled={isSaving} style={styles.changeButton}>
            <Text style={styles.changeText}>Choose a different feeling</Text>
          </Pressable>
          <TextInput accessibilityLabel="Notes about your mood" value={note} onChangeText={setNote}
            multiline maxLength={4000} placeholder="Leave some notes (optional)"
            placeholderTextColor="rgba(255,255,255,0.64)" style={styles.noteInput} editable={!isSaving} />
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel="Save mood and return home"
            accessibilityState={{ disabled: isSaving, busy: isSaving }} disabled={isSaving}
            onPress={() => { Keyboard.dismiss(); onSave(selected, note); }}
            style={({ pressed }) => [styles.saveButton, (pressed || isSaving) && styles.dimmed]}>
            <Text style={styles.saveText}>{isSaving ? "Saving…" : "Save & return home"}</Text>
          </Pressable>
          <Text style={styles.footnote}>Every feeling belongs here.</Text>
        </Animated.View>
      )}
      {!selected && <Text style={styles.footnote}>There is no right or wrong answer.</Text>}
    </View>
  );
}

function MoodOrb({ item, index, size, width, motion, selected, disabled, onSelect }: {
  item: typeof OPTIONS[number]; index: number; size: number; width: number;
  motion: boolean; selected: Mood | null; disabled: boolean; onSelect: () => void;
}) {
  const [breath] = useState(() => new Animated.Value(0));
  const [transition] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(1));
  const [lastSelection, setLastSelection] = useState<Mood | null>(null);
  if (selected !== null && selected !== lastSelection) setLastSelection(selected);
  const chosen = selected === item.mood;
  // Keep the previous endpoints while reversing, so the orb glides home.
  const wasChosen = (selected ?? lastSelection) === item.mood;
  const hidden = selected !== null && !chosen;
  const initialX = item.x * (width - size);
  const initialY = item.y * (width - 20);

  useEffect(() => {
    if (!motion || hidden) {
      breath.stopAnimation();
      breath.setValue(0);
      return;
    }
    const cycle = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2400 + index * 110, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(breath, { toValue: 0, duration: 2400 + index * 110, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    const timer = setTimeout(() => cycle.start(), index * 220);
    return () => { clearTimeout(timer); cycle.stop(); breath.setValue(0); };
  }, [breath, motion, hidden, index]);

  useEffect(() => {
    const animation = Animated.timing(transition, {
      toValue: selected ? 1 : 0, duration: motion ? 600 : 0,
      easing: Easing.inOut(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [selected, motion, transition]);

  const animatePress = (value: number) => Animated.timing(press, {
    toValue: value, duration: motion ? 160 : 0, easing: Easing.out(Easing.quad), useNativeDriver: true,
  }).start();

  return (
    <Animated.View pointerEvents={hidden ? "none" : "auto"}
      accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      style={[styles.orbPosition, { left: initialX, top: initialY, width: size,
        opacity: !wasChosen ? transition.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 1,
        transform: [
          { translateX: transition.interpolate({ inputRange: [0, 1], outputRange: [0, wasChosen ? (width - size) / 2 - initialX : 0] }) },
          { translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [0, wasChosen ? 64 - initialY : 0] }) },
          { scale: transition.interpolate({ inputRange: [0, 1], outputRange: [1, wasChosen ? Math.min(181, width * 0.55) / size : 0.84] }) },
        ],
      }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Feeling ${item.label.toLowerCase()}`}
        accessibilityState={{ selected: chosen, disabled }} disabled={disabled || !!selected}
        onPress={onSelect} onPressIn={() => animatePress(0.94)} onPressOut={() => animatePress(1)}>
        <Animated.View style={{ width: size, height: size, transform: [{ scale: press }] }}>
          {/* Both layers fade to transparent: no opaque disk or hard circular edge.
              Keep the layout/hit target fixed while the light breathes around it. */}
          <Animated.View pointerEvents="none" style={[styles.glowLayer, {
            width: size * 1.64, height: size * 1.64,
            left: -size * 0.32, top: -size * 0.32,
            opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.46] }),
            transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1.18] }) }],
          }]}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100">
              <Defs><RadialGradient id={`mood-glow-${item.mood}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={item.color} stopOpacity="0.7" />
                <Stop offset="35%" stopColor={item.color} stopOpacity="0.46" />
                <Stop offset="65%" stopColor={item.color} stopOpacity="0.18" />
                <Stop offset="85%" stopColor={item.color} stopOpacity="0.045" />
                <Stop offset="100%" stopColor={item.color} stopOpacity="0" />
              </RadialGradient></Defs>
              <Rect width="100" height="100" fill={`url(#mood-glow-${item.mood})`} />
            </Svg>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.glowLayer, {
            width: size * 1.26, height: size * 1.26,
            left: -size * 0.13, top: -size * 0.13,
            opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] }),
            transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] }) }],
          }]}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100">
              <Defs><RadialGradient id={`mood-core-${item.mood}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={item.color} stopOpacity="1" />
                <Stop offset="42%" stopColor={item.color} stopOpacity="1" />
                <Stop offset="60%" stopColor={item.color} stopOpacity="0.95" />
                <Stop offset="74%" stopColor={item.color} stopOpacity="0.7" />
                <Stop offset="86%" stopColor={item.color} stopOpacity="0.27" />
                <Stop offset="100%" stopColor={item.color} stopOpacity="0" />
              </RadialGradient></Defs>
              <Rect width="100" height="100" fill={`url(#mood-core-${item.mood})`} />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Pressable>
      <Animated.Text style={[styles.orbLabel, { opacity: transition.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }) }]}>{item.label}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", paddingTop: 30, paddingBottom: 100 },
  brand: { alignSelf: "center", color: colors.fg.primary, fontFamily: typography.family.brand, fontSize: 20, lineHeight: 28 },
  heading: { marginTop: 54, minHeight: 126, gap: 12 },
  title: { color: colors.fg.primary, fontSize: 34, lineHeight: 42, fontWeight: "400", letterSpacing: -0.4 },
  subtitle: { color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 22 },
  cluster: { alignSelf: "center", marginTop: 40 },
  orbPosition: { position: "absolute" },
  glowLayer: { position: "absolute" },
  orbLabel: { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 12 },
  notes: { width: "100%", gap: 12 },
  changeButton: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  changeText: { color: "rgba(255,255,255,0.86)", fontSize: 14, textDecorationLine: "underline" },
  noteInput: { minHeight: 152, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.sm, paddingHorizontal: 18, paddingVertical: 14, color: colors.fg.primary, backgroundColor: "rgba(255,255,255,0.03)", fontSize: 16, lineHeight: 24, textAlignVertical: "top" },
  saveButton: { minHeight: 55, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.sm, backgroundColor: "rgba(0,51,150,0.22)" },
  saveText: { color: colors.fg.primary, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  dimmed: { opacity: 0.6 },
  footnote: { marginTop: 18, color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 20, textAlign: "center" },
  error: { color: "#FFE4DE", lineHeight: 22, fontSize: 14 },
});
