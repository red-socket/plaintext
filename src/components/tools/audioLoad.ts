import { readWav } from '../../lib/audio';

/**
 * Turns an audio file into mono samples. WAV is read directly at its own sample rate; anything
 * else goes through the browser's decoder, resampled to `fallbackRate`.
 */
export async function loadAudio(bytes: ArrayBuffer, fallbackRate = 44100): Promise<{ samples: Float32Array; sampleRate: number }> {
  try {
    return readWav(new Uint8Array(bytes));
  } catch {
    const ctx = new AudioContext({ sampleRate: fallbackRate });
    try {
      const buf = await ctx.decodeAudioData(bytes.slice(0));
      const out = new Float32Array(buf.length);
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const ch = buf.getChannelData(c);
        for (let i = 0; i < ch.length; i++) out[i] += ch[i] / buf.numberOfChannels;
      }
      return { samples: out, sampleRate: buf.sampleRate };
    } finally {
      ctx.close();
    }
  }
}
