import { useCallback, useEffect, useRef, useState } from "react";
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
import { MOOD_TIMING, moodOrbFrames } from "./mood-motion";

const OPTIONS: { mood: Mood; label: string; color: string; message: string }[] = [
  { mood: "great", label: "Great", color: "#FED986", message: "Glad to see it" },
  { mood: "good", label: "Good", color: "#95CDF1", message: "Enjoy this moment" },
  { mood: "okay", label: "Okay", color: "#878EF1", message: "It's okay to just be" },
  { mood: "low", label: "Low", color: "#FFC78D", message: "Take it gently" },
  { mood: "bad", label: "Struggling", color: "#FE8C6D", message: "You don't have to carry it alone" },
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
  const [phase, setPhase] = useState<"choosing" | "selecting" | "selected" | "returning">("choosing");
  const transitionLocked = useRef(false);
  const motion = useMoodMotion();
  const { width } = useWindowDimensions();
  const clusterWidth = Math.min(334, Math.max(220, width - 64));
  const option = phase === "selected" || phase === "returning" ? OPTIONS.find(item => item.mood === selected) : undefined;
  const [transition] = useState(() => new Animated.Value(0));
  const [panel] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      transitionLocked.current = false;
      if (phase === "selecting") setPhase("selected");
      if (phase === "returning") {
        setSelected(null);
        setPhase("choosing");
      }
    };
    const move = (toValue: number, duration: number) => Animated.timing(transition, {
      toValue, duration, easing: Easing.inOut(Easing.cubic), useNativeDriver: true,
    });
    const revealNotes = (toValue: number, duration: number) => Animated.timing(panel, {
      toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    });
    // Reduced motion and interrupted focus/background transitions settle at the
    // target immediately, including releasing the interaction lock.
    if (!motion) {
      transition.setValue(phase === "choosing" || phase === "returning" ? 0 : 3);
      panel.setValue(phase === "selected" || phase === "selecting" ? 1 : 0);
      finish();
      return;
    }
    let animation: Animated.CompositeAnimation;
    if (phase === "selecting") {
      animation = Animated.sequence([
        move(1, MOOD_TIMING.anticipate),
        move(2, MOOD_TIMING.gather),
        Animated.delay(MOOD_TIMING.hold),
        move(3, MOOD_TIMING.reveal),
      ]);
    } else if (phase === "returning") {
      animation = Animated.sequence([revealNotes(0, 180), move(0, MOOD_TIMING.return)]);
    } else if (phase === "selected") {
      animation = revealNotes(1, MOOD_TIMING.notes);
    } else {
      transition.setValue(0);
      panel.setValue(0);
      return;
    }
    animation.start(({ finished }) => { if (finished) finish(); });
    return () => { cancelled = true; animation.stop(); };
  }, [phase, motion, panel, transition]);

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
          <MoodOrb key={item.mood} item={item} index={index} width={clusterWidth}
            transition={transition} motion={motion} breathing={phase === "choosing" || phase === "selected"}
            selected={selected} disabled={isSaving || phase !== "choosing"} onSelect={() => {
              if (transitionLocked.current || isSaving || phase !== "choosing") return;
              transitionLocked.current = true;
              Keyboard.dismiss();
              setSelected(item.mood);
              setPhase("selecting");
            }} />
        ))}
      </Animated.View>

      {selected && (phase === "selected" || phase === "returning") && (
        <Animated.View pointerEvents={phase === "returning" ? "none" : "auto"}
          accessibilityElementsHidden={phase === "returning"}
          importantForAccessibility={phase === "returning" ? "no-hide-descendants" : "auto"} style={[styles.notes, {
          opacity: panel,
          transform: [{ translateY: panel.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}>
          <Pressable accessibilityRole="button" onPress={() => {
            if (transitionLocked.current || isSaving || phase !== "selected") return;
            transitionLocked.current = true;
            Keyboard.dismiss();
            setPhase("returning");
          }}
            disabled={isSaving || phase !== "selected"} style={styles.changeButton}>
            <Text style={styles.changeText}>Choose a different feeling</Text>
          </Pressable>
          <TextInput accessibilityLabel="Notes about your mood" value={note} onChangeText={setNote}
            multiline maxLength={4000} placeholder="Leave some notes (optional)"
            placeholderTextColor="rgba(255,255,255,0.64)" style={styles.noteInput} editable={!isSaving && phase === "selected"} />
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel="Save mood and return home"
            accessibilityState={{ disabled: isSaving || phase !== "selected", busy: isSaving }} disabled={isSaving || phase !== "selected"}
            onPress={() => { if (transitionLocked.current || phase !== "selected") return; Keyboard.dismiss(); onSave(selected, note); }}
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

function MoodOrb({ item, index, width, motion, breathing, selected, disabled, onSelect, transition }: {
  item: typeof OPTIONS[number]; index: number; width: number; transition: Animated.Value;
  motion: boolean; breathing: boolean; selected: Mood | null; disabled: boolean; onSelect: () => void;
}) {
  const [breath] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(1));
  const chosen = selected === item.mood;
  const hidden = selected !== null && !chosen;
  const frames = moodOrbFrames(item.mood, width, chosen);
  const { size } = frames;

  useEffect(() => {
    if (!motion) {
      breath.stopAnimation();
      breath.setValue(0);
      return;
    }
    // Freeze the current breath during selection, rather than shrinking the
    // light to its minimum just before the anticipation starts.
    if (!breathing || hidden) return;
    const cycle = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2400 + index * 110, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(breath, { toValue: 0, duration: 2400 + index * 110, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    const timer = setTimeout(() => cycle.start(), index * 220);
    return () => { clearTimeout(timer); cycle.stop(); };
  }, [breath, motion, breathing, hidden, index]);



  const animatePress = (value: number) => Animated.timing(press, {
    toValue: value, duration: motion ? 160 : 0, easing: Easing.out(Easing.quad), useNativeDriver: true,
  }).start();

  return (
    <Animated.View pointerEvents={hidden ? "none" : "auto"}
      accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      testID={`mood-orb-${item.mood}`}
      style={[styles.orbPosition, { left: frames.x, top: frames.y, width: size, height: size, zIndex: chosen ? 1 : 0,
        opacity: transition.interpolate({ inputRange: [0, 1, 2, 3], outputRange: frames.opacity }),
        transform: [
          { translateX: transition.interpolate({ inputRange: [0, 1, 2, 3], outputRange: frames.translateX }) },
          { translateY: transition.interpolate({ inputRange: [0, 1, 2, 3], outputRange: frames.translateY }) },
          { scale: transition.interpolate({ inputRange: [0, 1, 2, 3], outputRange: frames.scale }) },
        ],
      }]} >
      <Pressable accessibilityRole="button" accessibilityLabel={`Feeling ${item.label.toLowerCase()}`}
        accessibilityState={{ selected: chosen, disabled: disabled || !!selected }} disabled={disabled || !!selected}
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
      <Animated.Text style={[styles.orbLabel, { top: size + 12, opacity: transition.interpolate({ inputRange: [0, 0.6, 3], outputRange: [1, 0, 0] }) }]}>{item.label}</Animated.Text>
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
  orbLabel: { position: "absolute", width: "100%", color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 20, textAlign: "center" },
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
