import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { ExpoSpeechRecognitionModuleType } from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';
import { mergeDictation } from '@/lib/dictation';

export function useDictation(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moduleRef = useRef<ExpoSpeechRecognitionModuleType | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const focused = useRef(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const onText = useRef(onTranscript); onText.current = onTranscript;
  const cancel = useCallback(() => {
    generation.current++;
    cleanupRef.current?.(); cleanupRef.current = null;
    try { moduleRef.current?.abort(); } catch { /* Unsupported runtime keeps typed input. */ }
    busy.current = false; setListening(false); setPending(false);
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') cancel(); });
    return () => { focused.current = false; subscription.remove(); cancel(); };
  }, [cancel]));
  async function start(existing: string) {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(null);
    const token = ++generation.current;
    const current = () => focused.current && token === generation.current;
    try {
      // Lazy load: Expo Go doesn't include this native module; typing must still work.
      const speech = require('expo-speech-recognition').ExpoSpeechRecognitionModule as ExpoSpeechRecognitionModuleType;
      moduleRef.current = speech;
      if (!speech.isRecognitionAvailable()) throw new Error('Speech recognition is not available here. You can type or use your keyboard microphone.');
      const permission = await speech.requestPermissionsAsync();
      if (!current()) return;
      if (!permission.granted) throw new Error('Microphone or speech permission was not granted. You can still type your entry.');
      const subscriptions = [
        speech.addListener('start', () => { if (current()) { setListening(true); setPending(false); } }),
        speech.addListener('result', event => { if (current() && event.results[0]) onText.current(mergeDictation(existing, event.results[0].transcript)); }),
        speech.addListener('error', event => { if (current() && event.error !== 'aborted') setError('Dictation stopped. Your text is kept; try again or continue typing.'); }),
        speech.addListener('end', () => {
          if (current()) { busy.current = false; setListening(false); setPending(false); }
          subscriptions.forEach(s => s.remove());
          cleanupRef.current = null;
        }),
      ];
      cleanupRef.current = () => subscriptions.forEach(s => s.remove());
      speech.start({ lang: 'en-US', interimResults: true, continuous: false, maxAlternatives: 1 });
    } catch (failure) {
      if (current()) {
        cleanupRef.current?.(); cleanupRef.current = null;
        busy.current = false; setPending(false); setListening(false);
        setError(failure instanceof Error && /permission|not available/.test(failure.message) ? failure.message : 'In-app dictation needs a supported browser or a native development build. You can type or use your keyboard microphone.');
      }
    }
  }
  function stop() {
    try { moduleRef.current?.stop(); }
    catch { cancel(); setError('Dictation stopped. Your text is kept.'); }
  }
  return { listening, pending, error, start, stop, cancel };
}
