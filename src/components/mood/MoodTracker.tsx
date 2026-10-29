import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { MOOD_KEYFRAMES, MOOD_POINT, MOOD_TIMING, moodOrbFrames, smoothMoodTrack } from "./mood-motion";

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
  const option = OPTIONS.find(item => item.mood === selected);
  const [transition] = useState(() => new Animated.Value(0));
  const [panel] = useState(() => new Animated.Value(0));
  const showDetails = phase === "selected";
  const greeting = (message: string) => `${message}${firstName ? `,\n${firstName}` : "."}`;
  const headingFade = useMemo(() => ({
    question: transition.interpolate(smoothMoodTrack([1, 1, 0, 0], [0, 1.1, MOOD_POINT, 4])),
    response: transition.interpolate(smoothMoodTrack([0, 0, 1, 1], [0, MOOD_POINT, 3.6, 4])),
  }), [transition]);

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
      toValue, duration, easing: Easing.linear, useNativeDriver: true,
    });
    const revealNotes = (toValue: number, duration: number) => Animated.timing(panel, {
      toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    });
    // Reduced motion and interrupted focus/background transitions settle at the
    // target immediately, including releasing the interaction lock.
    if (!motion) {
      transition.setValue(phase === "choosing" || phase === "returning" ? 0 : 4);
      panel.setValue(phase === "selected" || phase === "selecting" ? 1 : 0);
      finish();
      return;
    }
    let animation: Animated.CompositeAnimation;
    if (phase === "selecting") {
      animation = move(4, MOOD_TIMING.select);
    } else if (phase === "returning") {
      animation = Animated.parallel([revealNotes(0, MOOD_TIMING.notes), move(0, MOOD_TIMING.return)]);
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
    <Animated.View style={[styles.content, {
      // Keep overall content height stable as the notes move up, preventing a
      // scrollbar/layout shift at the handoff from the orb to the form.
      paddingBottom: panel.interpolate({ inputRange: [0, 1], outputRange: [100, 100 + clusterWidth + 38 - 218] }),
    }]}>
      <Text style={styles.brand}>Kairos</Text>
      <View style={styles.heading} accessibilityLiveRegion="polite">
        {/* Reserve the longest response at the current width/font size so a
            multi-line greeting never pushes the orb when it fades in. */}
        <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.headingSizer}>
          <Text style={styles.title}>{greeting("You don't have to carry it alone")}</Text>
          <Text style={styles.subtitle}>Take a breath. Choose what feels closest.</Text>
        </View>
        <Animated.View pointerEvents="none" aria-hidden={showDetails} accessibilityElementsHidden={showDetails}
          importantForAccessibility={showDetails ? "no-hide-descendants" : "auto"}
          style={[styles.headingLayer, { opacity: headingFade.question }]}>
          <Text style={styles.title}>{"How do you feel\ntoday?"}</Text>
          <Text style={styles.subtitle}>Take a breath. Choose what feels closest.</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" aria-hidden={!showDetails} accessibilityElementsHidden={!showDetails}
          importantForAccessibility={!showDetails ? "no-hide-descendants" : "auto"}
          style={[styles.headingLayer, { opacity: headingFade.response }]}>
          <Text style={styles.title}>{option ? greeting(option.message) : ""}</Text>
          <Text style={styles.subtitle}>A little space for how you feel.</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.cluster, { width: clusterWidth, height: panel.interpolate({ inputRange: [0, 1], outputRange: [clusterWidth + 38, 218] }) }]}>
        {OPTIONS.map((item, index) => (
          <MoodOrb key={item.mood} item={item} index={index} width={clusterWidth}
            transition={transition} returning={phase === "returning"} motion={motion} breathing={phase !== "selected" || selected === item.mood}
            selected={selected} disabled={isSaving || phase !== "choosing"} onSelect={() => {
              if (transitionLocked.current || isSaving || phase !== "choosing") return;
              transitionLocked.current = true;
              Keyboard.dismiss();
              setSelected(item.mood);
              setPhase("selecting");
            }} />
        ))}
        {!selected && <Text style={[styles.footnote, styles.choicesFootnote]}>There is no right or wrong answer.</Text>}
      </Animated.View>

        <Animated.View pointerEvents={showDetails ? "auto" : "none"} aria-hidden={!showDetails}
          accessibilityElementsHidden={!showDetails}
          importantForAccessibility={!showDetails ? "no-hide-descendants" : "auto"} style={[styles.notes, {
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
            tabIndex={showDetails ? 0 : -1} focusable={showDetails}
            multiline maxLength={4000} placeholder="Leave some notes (optional)"
            placeholderTextColor="rgba(255,255,255,0.64)" style={styles.noteInput} editable={!isSaving && phase === "selected"} />
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel="Save mood and return home"
            accessibilityState={{ disabled: isSaving || phase !== "selected", busy: isSaving }} disabled={isSaving || phase !== "selected"}
            onPress={() => { if (transitionLocked.current || phase !== "selected" || !selected) return; Keyboard.dismiss(); onSave(selected, note); }}
            style={({ pressed }) => [styles.saveButton, (pressed || isSaving) && styles.dimmed]}>
            <Text style={styles.saveText}>{isSaving ? "Saving…" : "Save & return home"}</Text>
          </Pressable>
          <Text style={styles.footnote}>Every feeling belongs here.</Text>
        </Animated.View>
    </Animated.View>
  );
}

function MoodOrb({ item, index, width, motion, breathing, selected, disabled, onSelect, transition, returning }: {
  item: typeof OPTIONS[number]; index: number; width: number; transition: Animated.Value;
  motion: boolean; breathing: boolean; selected: Mood | null; disabled: boolean; returning: boolean; onSelect: () => void;
}) {
  const [breath] = useState(() => new Animated.Value(0));
  const breathStarted = useRef(false);
  const [press] = useState(() => new Animated.Value(1));
  const chosen = selected === item.mood;
  const hidden = selected !== null && !chosen;
  const frames = useMemo(() => moodOrbFrames(item.mood, width, chosen, returning), [item.mood, width, chosen, returning]);
  const { size } = frames;
  const movement = useMemo(() => ({
    opacity: transition.interpolate(smoothMoodTrack(frames.opacity)),
    transform: [
      // Movement begins during the initial swell; every color then shares the
      // exact central point before the selected light opens out of it.
      { translateX: transition.interpolate(smoothMoodTrack(frames.translateX, [0, 0.1, MOOD_KEYFRAMES[2], MOOD_POINT, 4])) },
      { translateY: transition.interpolate(smoothMoodTrack(frames.translateY, [0, 0.1, MOOD_KEYFRAMES[2], MOOD_POINT, 4])) },
      { scale: transition.interpolate(smoothMoodTrack(frames.scale)) },
    ],
  }), [frames, transition]);
  const light = useMemo(() => {
    // Keep the five choices expressive. As the selected light opens from the
    // central point, ease its breathing down to a quiet quarter-amplitude pulse.
    // The same envelope reverses smoothly when returning to the choices.
    const strength = transition.interpolate(smoothMoodTrack([1, 1, 0.25], [0, MOOD_POINT, 4]));
    const pulse = Animated.multiply(Animated.subtract(breath, 0.5), strength);
    return {
      haloOpacity: pulse.interpolate({ inputRange: [-0.5, 0.5], outputRange: [0.18, 0.52] }),
      haloScale: pulse.interpolate({ inputRange: [-0.5, 0.5], outputRange: [0.78, 1.26] }),
      coreOpacity: pulse.interpolate({ inputRange: [-0.5, 0.5], outputRange: [0.88, 1] }),
      coreScale: pulse.interpolate({ inputRange: [-0.5, 0.5], outputRange: [0.84, 1.16] }),
    };
  }, [breath, transition]);

  useEffect(() => {
    if (!motion) {
      breath.stopAnimation();
      breath.setValue(0);
      return;
    }
    // Keep breathing through the transition. Pause only orbs that have fully
    // disappeared, preserving their current breath for reselection.
    if (!breathing) return;
    const cycle = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2600 + index * 90, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(breath, { toValue: 0, duration: 3400 + index * 120, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]), { resetBeforeIteration: false });
    const timer = setTimeout(() => {
      breathStarted.current = true;
      cycle.start();
    }, breathStarted.current ? 0 : index * 180);
    return () => { clearTimeout(timer); cycle.stop(); };
  }, [breath, motion, breathing, index]);

  const animatePress = (value: number) => Animated.timing(press, {
    toValue: value, duration: motion ? 160 : 0, easing: Easing.out(Easing.quad), useNativeDriver: true,
  }).start();

  return (
    <Animated.View pointerEvents={hidden ? "none" : "auto"}
      accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      testID={`mood-orb-${item.mood}`}
      style={[styles.orbPosition, { left: frames.x, top: frames.y, width: size, height: size, zIndex: chosen ? 1 : 0 }, movement]} >
      <Pressable accessibilityRole="button" accessibilityLabel={`Feeling ${item.label.toLowerCase()}`}
        accessibilityState={{ selected: chosen, disabled: disabled || !!selected }} disabled={disabled || !!selected}
        onPress={onSelect} onPressIn={() => animatePress(0.98)} onPressOut={() => animatePress(1)}>
        <Animated.View style={{ width: size, height: size, transform: [{ scale: press }] }}>
          {/* Both layers fade to transparent: no opaque disk or hard circular edge.
              Keep the layout/hit target fixed while the light breathes around it. */}
          <Animated.View pointerEvents="none" style={[styles.glowLayer, {
            width: size * 1.64, height: size * 1.64,
            left: -size * 0.32, top: -size * 0.32,
            opacity: light.haloOpacity,
            transform: [{ scale: light.haloScale }],
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
            opacity: light.coreOpacity,
            transform: [{ scale: light.coreScale }],
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
      <Animated.Text style={[styles.orbLabel, { top: size + 12, opacity: transition.interpolate({ inputRange: [0, 0.6, 4], outputRange: [1, 0, 0] }) }]}>{item.label}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", paddingTop: 30, paddingBottom: 100 },
  brand: { alignSelf: "center", color: colors.fg.primary, fontFamily: typography.family.brand, fontSize: 20, lineHeight: 28 },
  heading: { marginTop: 54, minHeight: 126, gap: 12 },
  headingSizer: { gap: 12, opacity: 0 },
  headingLayer: { position: "absolute", top: 0, left: 0, right: 0, gap: 12 },
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
  choicesFootnote: { position: "absolute", top: "100%", width: "100%" },
  error: { color: "#FFE4DE", lineHeight: 22, fontSize: 14 },
});
