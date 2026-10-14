type ChatSoundTone = {
  frequency: number;
  delay: number;
  duration: number;
  volume: number;
};

type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;

  const browserWindow = window as BrowserWindow;
  const AudioContextConstructor =
    browserWindow.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextConstructor) return null;

  audioContext ??= new AudioContextConstructor();
  return audioContext;
};

const scheduleTones = (context: AudioContext, tones: ChatSoundTone[]) => {
  const startTime = context.currentTime + 0.01;

  tones.forEach(({ frequency, delay, duration, volume }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const toneStart = startTime + delay;
    const toneEnd = toneStart + duration;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, toneStart);
    gain.gain.setValueAtTime(0.0001, toneStart);
    gain.gain.exponentialRampToValueAtTime(volume, toneStart + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.01);
  });
};

const playTones = (tones: ChatSoundTone[]) => {
  const context = getAudioContext();
  if (!context) return;

  const play = () => scheduleTones(context, tones);
  if (context.state === "suspended") {
    void context.resume().then(play).catch(() => {
      // Browsers may block audio until the user interacts with the page.
    });
    return;
  }

  play();
};

export const playSentMessageSound = () => {
  playTones([
    { frequency: 440, delay: 0, duration: 0.07, volume: 0.035 },
    { frequency: 620, delay: 0.055, duration: 0.09, volume: 0.045 },
  ]);
};

export const playReplyMessageSound = () => {
  playTones([
    { frequency: 660, delay: 0, duration: 0.08, volume: 0.04 },
    { frequency: 520, delay: 0.065, duration: 0.11, volume: 0.035 },
  ]);
};
