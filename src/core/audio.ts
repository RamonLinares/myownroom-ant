/** Tiny procedural WebAudio synth for UI/gameplay feedback. */
class GameAudio {
  private ctx: AudioContext | null = null;
  muted = localStorage.getItem('myownroom-ant-muted') === '1';

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    localStorage.setItem('myownroom-ant-muted', m ? '1' : '0');
  }

  private tone(freq: number, dur: number, type: OscillatorType, gainPeak: number, glideTo?: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  private noise(dur: number, peak: number, cutoff = 1200): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = peak;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  rustle(): void { this.noise(0.28, 0.14, 900); }
  knock(): void { this.noise(0.07, 0.55, 300); setTimeout(() => this.noise(0.07, 0.5, 280), 190); }
  squeak(): void { this.tone(850, 0.09, 'triangle', 0.05, 1500); }
  creak(): void { this.tone(190, 0.32, 'sawtooth', 0.02, 120); }
  chime(): void { this.tone(880, 0.5, 'sine', 0.05); setTimeout(() => this.tone(660, 0.6, 'sine', 0.05), 380); }
  piano(): void {
    // A little arpeggiated chord with a soft octave on top.
    [262, 330, 392, 523].forEach((f, i) =>
      setTimeout(() => {
        this.tone(f, 0.6, 'triangle', 0.05);
        this.tone(f * 2, 0.5, 'sine', 0.02);
      }, i * 130)
    );
  }

  musicBox(): void {
    [1047, 1319, 1568, 2093, 1568, 1319, 1047, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'triangle', 0.035), i * 200));
  }

  tunePlaying = false;
  private tuneTimer: number | undefined;

  /** Starts or stops a gentle looping arpeggio (radio / record player). */
  toggleTune(): boolean {
    if (this.tunePlaying) {
      window.clearTimeout(this.tuneTimer);
      this.tunePlaying = false;
      return false;
    }
    this.tunePlaying = true;
    const notes = [392, 494, 587, 494, 659, 587, 494, 440];
    let i = 0;
    const step = (): void => {
      if (!this.tunePlaying) return;
      this.tone(notes[i % notes.length], 0.24, 'triangle', 0.045);
      if (i % 2 === 0) this.tone(notes[i % notes.length] / 2, 0.34, 'sine', 0.028);
      i++;
      this.tuneTimer = window.setTimeout(step, 300);
    };
    step();
    return true;
  }

  select(): void { this.tone(520, 0.08, 'sine', 0.05); }
  place(): void { this.tone(392, 0.1, 'sine', 0.07); setTimeout(() => this.tone(587, 0.14, 'sine', 0.06), 70); }
  pickup(): void { this.tone(440, 0.07, 'triangle', 0.05, 520); }
  remove(): void { this.tone(340, 0.18, 'sine', 0.06, 160); }
  error(): void { this.tone(160, 0.14, 'square', 0.03); }
  click(): void { this.tone(680, 0.05, 'sine', 0.04); }
  shutter(): void { this.tone(1400, 0.03, 'square', 0.035); setTimeout(() => this.tone(700, 0.04, 'square', 0.03), 45); }
}

export const audio = new GameAudio();
