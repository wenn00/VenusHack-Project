/**
 * Browser video recording for the web rPPG flow.
 *
 * expo-camera cannot record on web (`record()` → "not supported on web"),
 * so the web screen records the front camera with getUserMedia +
 * MediaRecorder instead. iOS Safari records MP4/H.264, Chrome on Android
 * records WebM; the backend decodes both through OpenCV's FFmpeg.
 */

const MIME_PREFERENCE = ["video/mp4", "video/webm;codecs=vp8", "video/webm"];

/**
 * Low resolution on purpose: rPPG only needs the average skin colour, and
 * the 0.1-CPU backend processes a 480p clip ~35% faster than a 720p one.
 */
export const WEB_RECORDING_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
};

export function pickRecorderMimeType(isTypeSupported: (type: string) => boolean): string | null {
  return MIME_PREFERENCE.find((type) => isTypeSupported(type)) ?? null;
}

export function fileNameForMimeType(mime: string): "rppg.mp4" | "rppg.webm" {
  return mime.startsWith("video/webm") ? "rppg.webm" : "rppg.mp4";
}

/**
 * Record `seconds` of `stream`. Aborting `signal` stops the recorder and
 * rejects with an AbortError so a cancelled clip is never uploaded.
 */
export function recordStream(
  stream: MediaStream,
  mimeType: string,
  seconds: number,
  signal?: AbortSignal,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Recording cancelled", "AbortError"));
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    let aborted = false;

    const stop = () => {
      if (recorder.state !== "inactive") recorder.stop();
    };
    const timer = setTimeout(stop, seconds * 1000);
    const onAbort = () => {
      aborted = true;
      stop();
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("Recording failed."));
    };
    recorder.onstop = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (aborted) {
        reject(new DOMException("Recording cancelled", "AbortError"));
        return;
      }
      resolve(new Blob(chunks, { type: mimeType }));
    };

    // A timeslice makes the browser hand over data as it records, so a
    // long clip never sits in one giant internal buffer.
    recorder.start(1000);
  });
}
