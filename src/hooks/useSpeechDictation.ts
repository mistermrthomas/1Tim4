import { useCallback, useEffect, useRef, useState } from 'react';

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

const MIC_WARMED_KEY = 'path-mic-warmed';

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** iOS/Safari: prime mic permission before SpeechRecognition so the first Dictate tap works. */
async function warmMicrophoneIfNeeded(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return true;
  }
  try {
    if (sessionStorage.getItem(MIC_WARMED_KEY) === '1') {
      return true;
    }
  } catch {
    /* sessionStorage unavailable */
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    try {
      sessionStorage.setItem(MIC_WARMED_KEY, '1');
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

export type DictationStatus = 'idle' | 'requesting' | 'listening';

export function useSpeechDictation(onPhrase: (phrase: string) => void) {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const sessionRef = useRef(0);
  const supported = getSpeechRecognitionCtor() !== null;
  const onPhraseRef = useRef(onPhrase);
  onPhraseRef.current = onPhrase;

  const stop = useCallback(() => {
    sessionRef.current += 1;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recognitionRef.current = null;
    setStatus('idle');
  }, []);

  const runRecognition = useCallback(
    async (sessionId: number, attempt: number): Promise<void> => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor || sessionId !== sessionRef.current) return;

      const recognition = new Ctor();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let heardSpeech = false;
      const startedAt = Date.now();

      recognition.onstart = () => {
        if (sessionId !== sessionRef.current) return;
        setStatus('listening');
        setError(null);
      };

      recognition.onresult = (event) => {
        let phrase = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            phrase += event.results[i][0].transcript;
          }
        }
        if (phrase.trim()) {
          heardSpeech = true;
          onPhraseRef.current(phrase.trim());
        }
      };

      recognition.onerror = (event) => {
        if (sessionId !== sessionRef.current) return;
        if (event.error === 'aborted') return;
        if (event.error === 'not-allowed') {
          try {
            sessionStorage.removeItem(MIC_WARMED_KEY);
          } catch {
            /* ignore */
          }
          setError('Microphone access was denied.');
        } else if (event.error === 'audio-capture') {
          setError('Could not access the microphone. Try again.');
        } else {
          setError('Dictation stopped. Tap Dictate to try again.');
        }
        stop();
      };

      recognition.onend = () => {
        if (sessionId !== sessionRef.current) return;

        const endedQuickly = Date.now() - startedAt < 900;
        if (!heardSpeech && endedQuickly && attempt < 1) {
          void (async () => {
            await delay(280);
            if (sessionId !== sessionRef.current) return;
            await runRecognition(sessionId, attempt + 1);
          })();
          return;
        }

        recognitionRef.current = null;
        if (sessionId === sessionRef.current) {
          setStatus('idle');
        }
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch {
        if (sessionId !== sessionRef.current) return;
        if (attempt < 1) {
          await delay(280);
          if (sessionId !== sessionRef.current) return;
          await runRecognition(sessionId, attempt + 1);
          return;
        }
        setError('Could not start dictation. Tap Dictate again.');
        stop();
      }
    },
    [stop],
  );

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Dictation is not supported in this browser. Try Safari or Chrome on your phone.');
      return;
    }

    setError(null);
    sessionRef.current += 1;
    const sessionId = sessionRef.current;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recognitionRef.current = null;

    setStatus('requesting');

    const micOk = await warmMicrophoneIfNeeded();
    if (sessionId !== sessionRef.current) return;

    if (!micOk) {
      setError('Microphone access was denied.');
      setStatus('idle');
      return;
    }

    // Let iOS finish the permission sheet before SpeechRecognition starts.
    await delay(220);
    if (sessionId !== sessionRef.current) return;

    await runRecognition(sessionId, 0);
  }, [runRecognition, stop]);

  const toggle = useCallback(() => {
    if (status === 'listening' || status === 'requesting') {
      stop();
    } else {
      void start();
    }
  }, [status, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    supported,
    status,
    listening: status === 'listening',
    requesting: status === 'requesting',
    error,
    toggle,
    stop,
  };
}
