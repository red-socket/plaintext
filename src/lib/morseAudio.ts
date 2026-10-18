/**
 * Plays Morse code as tones with Web Audio. Uses Farnsworth timing: letters are sent at
 * `wpm`, but the gaps between letters and words are stretched to an `effective` speed,
 * which is how beginners learn to hear whole letters.
 */
export type MorseSpeed = { wpm: number; effective: number };

export const SPEEDS: Record<'slow' | 'normal' | 'fast', MorseSpeed> = {
  slow: { wpm: 15, effective: 6 },
  normal: { wpm: 18, effective: 12 },
  fast: { wpm: 22, effective: 20 },
};

/** Schedules the code and returns its length in seconds plus a stop function. */
export function playMorse(code: string, speed: MorseSpeed = SPEEDS.normal, freq = 620): { duration: number; stop: () => void } {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const unit = 1.2 / speed.wpm;
  // Farnsworth gap unit (ARRL formula).
  const gapUnit = speed.effective >= speed.wpm ? unit : (60 * speed.wpm - 37.2 * speed.effective) / (speed.wpm * speed.effective) / 19;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  gain.gain.value = 0;
  osc.connect(gain).connect(ctx.destination);

  let t = ctx.currentTime + 0.1;
  const ramp = 0.005;
  const tone = (len: number) => {
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + ramp);
    gain.gain.setValueAtTime(0.5, t + len - ramp);
    gain.gain.linearRampToValueAtTime(0, t + len);
    t += len;
  };

  const normalized = code.replace(/[·•]/g, '.').replace(/[_—–−]/g, '-').trim();
  const words = normalized.split(/\s*[\/|]\s*/);
  words.forEach((word, wi) => {
    const letters = word.split(/\s+/).filter(Boolean);
    letters.forEach((letter, li) => {
      [...letter].forEach((sym, si) => {
        if (sym === '.') tone(unit);
        else if (sym === '-') tone(unit * 3);
        if (si < letter.length - 1) t += unit;
      });
      if (li < letters.length - 1) t += gapUnit * 3;
    });
    if (wi < words.length - 1) t += gapUnit * 7;
  });

  const start = ctx.currentTime;
  osc.start();
  osc.stop(t + 0.05);
  osc.onended = () => ctx.close();
  return {
    duration: t - start,
    stop: () => {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
      ctx.close();
    },
  };
}
