import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DictationSession, idleDictation } from '@/lib/dictation-session';

export function useDictation(onTranscript: (text: string) => void) {
  const [state, setState] = useState(idleDictation);
  const [session] = useState(() => new DictationSession({
    // Unsupported runtimes must still be able to open the page and type.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Load only after the user requests dictation.
    loadSpeech: () => require('expo-speech-recognition').ExpoSpeechRecognitionModule,
    subscribeAfterStart: Platform.OS === 'web',
    onTranscript,
    onState: setState,
  }));
  useEffect(() => session.setOnTranscript(onTranscript), [session, onTranscript]);
  useFocusEffect(useCallback(() => {
    session.setFocused(true);
    session.handleAppState(AppState.currentState ?? 'active');
    const subscription = AppState.addEventListener('change', state => session.handleAppState(state));
    return () => { subscription.remove(); session.setFocused(false); };
  }, [session]));
  return { ...state, start: session.start, stop: session.stop, cancel: session.cancel, isBusy: session.isBusy };
}
