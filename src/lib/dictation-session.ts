import type { ExpoSpeechRecognitionModuleType } from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';
import { mergeDictation } from './dictation';

type Speech = Pick<ExpoSpeechRecognitionModuleType, 'isRecognitionAvailable' | 'requestPermissionsAsync' | 'addListener' | 'start' | 'stop' | 'abort'>;
type Phase = 'idle' | 'permission' | 'starting' | 'listening' | 'stopping';
export interface DictationState { listening: boolean; pending: boolean; stopping: boolean; error: string | null }
export const idleDictation: DictationState = { listening: false, pending: false, stopping: false, error: null };
const unavailable = 'In-app dictation needs a supported browser or a native development build. You can type or use your keyboard microphone.';
const stopped = 'Dictation stopped. Your text is kept; try again or continue typing.';

/** Owns one recognition attempt, including late events and permission interruptions. */
export class DictationSession {
  private focused = false;
  private generation = 0;
  private phase: Phase = 'idle';
  private appState = 'active';
  private error: string | null = null;
  private speech: Speech | null = null;
  private cleanup: (() => void) | null = null;
  private resume: (() => void) | null = null;

  constructor(private readonly options: {
    loadSpeech: () => Speech;
    /** Expo web attaches listeners to its current recognizer; create the new one first. */
    subscribeAfterStart?: boolean;
    onTranscript: (text: string) => void;
    onState: (state: DictationState) => void;
  }) {}

  setOnTranscript(callback: (text: string) => void) { this.options.onTranscript = callback; }

  isBusy = () => this.phase !== 'idle';

  private publish() {
    if (this.focused) this.options.onState({
      pending: this.phase === 'permission' || this.phase === 'starting',
      listening: this.phase === 'listening' || this.phase === 'stopping',
      stopping: this.phase === 'stopping',
      error: this.error,
    });
  }

  private finish(error: string | null = null, abort = false) {
    const wasBusy = this.isBusy();
    this.generation++;
    this.resume = null;
    const cleanup = this.cleanup;
    this.cleanup = null;
    cleanup?.();
    if (abort && wasBusy) {
      try { this.speech?.abort(); } catch { /* Typing remains usable. */ }
    }
    this.phase = 'idle';
    this.error = error;
    this.publish();
  }

  cancel = () => this.finish(null, true);

  setFocused(focused: boolean) {
    this.focused = focused;
    if (!focused) this.cancel();
    else this.publish();
  }

  handleAppState(state: string) {
    this.appState = state;
    // iOS permission prompts can temporarily make the app inactive.
    if (state === 'background' || (state === 'inactive' && this.phase !== 'permission')) this.cancel();
    if (state === 'active' && this.resume) {
      const resume = this.resume;
      this.resume = null;
      resume();
    }
  }

  start = async (existing: string) => {
    if (!this.focused || this.isBusy() || this.appState === 'background') return;
    const token = ++this.generation;
    const current = () => this.focused && token === this.generation;
    this.phase = 'permission';
    this.error = null;
    this.publish();
    try {
      const speech = this.options.loadSpeech();
      this.speech = speech;
      if (!speech.isRecognitionAvailable()) throw new Error('Speech recognition is not available here. You can type or use your keyboard microphone.');
      const permission = await speech.requestPermissionsAsync();
      if (!current()) return;
      if (!permission.granted) throw new Error('Microphone or speech permission was not granted. You can still type your entry.');
      const begin = () => {
        if (!current()) return;
        const subscriptions: { remove: () => void }[] = [];
        this.cleanup = () => subscriptions.forEach(s => s.remove());
        this.phase = 'starting';
        this.publish();
        try {
          const startSpeech = () => speech.start({ lang: 'en-US', interimResults: true, continuous: false, maxAlternatives: 1 });
          // Browser recognition events are asynchronous. Native listeners must be ready first.
          if (this.options.subscribeAfterStart) startSpeech();
          subscriptions.push(speech.addListener('start', () => {
            if (current() && this.phase === 'starting') { this.phase = 'listening'; this.publish(); }
          }));
          subscriptions.push(speech.addListener('result', event => {
            if (current() && event.results[0]) this.options.onTranscript(mergeDictation(existing, event.results[0].transcript));
          }));
          subscriptions.push(speech.addListener('error', event => {
            if (current()) this.finish(event.error === 'aborted' ? null : stopped, true);
          }));
          subscriptions.push(speech.addListener('end', () => { if (current()) this.finish(); }));
          if (!this.options.subscribeAfterStart) startSpeech();
        } catch { if (current()) this.finish(stopped, true); }
      };
      // Never start a microphone behind the permission dialog or another overlay.
      if (this.appState === 'inactive') this.resume = begin;
      else begin();
    } catch (failure) {
      if (current()) this.finish(failure instanceof Error && /permission|not available/.test(failure.message) ? failure.message : unavailable, true);
    }
  };

  stop = () => {
    if (this.phase !== 'listening') return;
    this.phase = 'stopping';
    this.publish();
    try { this.speech?.stop(); }
    catch { this.finish(stopped, true); }
  };
}
