import { describe, expect, it, vi } from 'vitest';
import { DictationSession, idleDictation, type DictationState } from './dictation-session';

type Speech = ReturnType<ConstructorParameters<typeof DictationSession>[0]['loadSpeech']>;
type Event = { error?: string; results?: { transcript: string }[] };
type Callback = (event: Event) => void;

function harness(subscribeAfterStart = false) {
  const listeners = new Map<string, Set<Callback>>();
  const speech = {
    isRecognitionAvailable: vi.fn(() => true),
    requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
    addListener: vi.fn((name: string, listener: Callback) => {
      const group = listeners.get(name) ?? new Set<Callback>();
      listeners.set(name, group); group.add(listener);
      return { remove: () => group.delete(listener) };
    }),
    start: vi.fn(), stop: vi.fn(), abort: vi.fn(),
  };
  const onTranscript = vi.fn();
  let state: DictationState = idleDictation;
  const loadSpeech = vi.fn(() => speech as unknown as Speech);
  const session = new DictationSession({ loadSpeech, subscribeAfterStart, onTranscript, onState: value => { state = value; } });
  session.setFocused(true);
  return { session, speech, loadSpeech, onTranscript, listeners, state: () => state,
    emit: (name: string, event: Event = {}) => [...(listeners.get(name) ?? [])].forEach(callback => callback(event)),
  };
}
function deferredPermission() {
  let resolve!: (value: { granted: boolean }) => void;
  const promise = new Promise<{ granted: boolean }>(done => { resolve = done; });
  return { promise, resolve };
}

describe('dictation session lifecycle', () => {
  it('keeps typing available when native loading or recognition support fails', async () => {
    const h = harness();
    h.loadSpeech.mockImplementationOnce(() => { throw new Error('Missing native module'); });
    await h.session.start('Typed');
    expect(h.session.isBusy()).toBe(false);
    expect(h.state().error).toMatch(/supported browser/);
    h.speech.isRecognitionAvailable.mockReturnValue(false);
    await h.session.start('Typed');
    expect(h.state()).toMatchObject({ pending: false, listening: false });
    expect(h.onTranscript).not.toHaveBeenCalled();
  });

  it('releases denied or rejected permission attempts', async () => {
    const h = harness();
    h.speech.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });
    await h.session.start('Typed');
    expect(h.state().error).toMatch(/permission was not granted/);
    h.speech.requestPermissionsAsync.mockRejectedValueOnce(new Error('permission unavailable'));
    await h.session.start('Typed');
    expect(h.session.isBusy()).toBe(false);
    expect(h.speech.start).not.toHaveBeenCalled();
  });

  it('does not confuse the iOS permission dialog with leaving the app', async () => {
    const h = harness(); const permission = deferredPermission();
    h.speech.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
    const attempt = h.session.start('Typed');
    h.session.handleAppState('inactive');
    permission.resolve({ granted: true }); await attempt;
    expect(h.speech.start).not.toHaveBeenCalled();
    expect(h.session.isBusy()).toBe(true);
    h.session.handleAppState('active');
    expect(h.speech.start).toHaveBeenCalledTimes(1);
    h.emit('start'); expect(h.state().listening).toBe(true);
  });

  it.each(['background', 'blur'])('cancels a permission request on %s and ignores its late response', async interruption => {
    const h = harness(); const permission = deferredPermission();
    h.speech.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
    const attempt = h.session.start('Typed');
    if (interruption === 'blur') h.session.setFocused(false);
    else h.session.handleAppState('background');
    permission.resolve({ granted: true }); await attempt;
    expect(h.speech.start).not.toHaveBeenCalled();
    expect(h.session.isBusy()).toBe(false);
  });

  it('blocks rapid starts and preserves the final result delivered after Stop', async () => {
    const h = harness();
    const attempt = h.session.start('Typed note.');
    await h.session.start('Duplicate'); await attempt;
    expect(h.speech.start).toHaveBeenCalledTimes(1);
    h.emit('start');
    h.emit('result', { results: [{ transcript: 'I feel' }] });
    h.session.stop(); h.session.stop();
    expect(h.speech.stop).toHaveBeenCalledTimes(1);
    expect(h.session.isBusy()).toBe(true);
    expect(h.state().stopping).toBe(true);
    h.emit('result', { results: [{ transcript: 'I feel well.' }] });
    expect(h.onTranscript.mock.calls.map(call => call[0])).toEqual(['Typed note. I feel', 'Typed note. I feel well.']);
    h.emit('end');
    expect(h.session.isBusy()).toBe(false);
    await h.session.start('Typed note. I feel well.');
    h.emit('result', { results: [{ transcript: 'More text.' }] });
    expect(h.onTranscript).toHaveBeenLastCalledWith('Typed note. I feel well. More text.');
  });

  it('unlocks typing on an error even if the native module never sends end', async () => {
    const h = harness(); await h.session.start('Keep this');
    h.emit('error', { error: 'audio-capture' });
    expect(h.state()).toMatchObject({ pending: false, listening: false, stopping: false });
    expect(h.state().error).toMatch(/text is kept/);
    expect(h.session.isBusy()).toBe(false);
    expect([...h.listeners.values()].every(group => group.size === 0)).toBe(true);
    await h.session.start('Keep this');
    expect(h.speech.start).toHaveBeenCalledTimes(2);
  });

  it('ignores late results and end events from a cancelled attempt after restart', async () => {
    const h = harness(); await h.session.start('Old');
    const lateResult = [...h.listeners.get('result')!][0];
    const lateEnd = [...h.listeners.get('end')!][0];
    h.session.cancel(); await h.session.start('New'); h.emit('start');
    lateResult({ results: [{ transcript: 'Stale' }] }); lateEnd({});
    expect(h.onTranscript).not.toHaveBeenCalled();
    expect(h.state().listening).toBe(true);
    h.session.cancel();
    expect([...h.listeners.values()].every(group => group.size === 0)).toBe(true);
  });

  it('handles synchronous start/stop failures and background cancellation', async () => {
    const h = harness();
    h.speech.start.mockImplementationOnce(() => { throw new Error('native start failed'); });
    await h.session.start('Typed'); expect(h.session.isBusy()).toBe(false);
    await h.session.start('Typed'); h.emit('start');
    h.speech.stop.mockImplementationOnce(() => { throw new Error('native stop failed'); });
    h.session.stop(); expect(h.session.isBusy()).toBe(false);
    await h.session.start('Typed'); h.emit('start');
    h.session.handleAppState('inactive');
    expect(h.session.isBusy()).toBe(false);
    expect(h.onTranscript).not.toHaveBeenCalled();
  });
  it('subscribes before a synchronous native start event', async () => {
    const h = harness();
    h.speech.start.mockImplementation(() => h.emit('start'));
    await h.session.start('Typed');
    expect(h.state().listening).toBe(true);
  });

  it('does not attach a new web session listener to the previous recognizer', async () => {
    const h = harness(true);
    const staleEnd: Callback[] = [];
    let previousRecognizer = true;
    const add = h.speech.addListener.getMockImplementation()!;
    h.speech.addListener.mockImplementation((name, listener) => {
      if (previousRecognizer && name === 'end') staleEnd.push(listener);
      return add(name, listener);
    });
    h.speech.start.mockImplementation(() => { previousRecognizer = false; });
    await h.session.start('New'); h.emit('start');
    staleEnd.forEach(listener => listener({}));
    expect(staleEnd).toHaveLength(0);
    expect(h.state().listening).toBe(true);
  });

});
