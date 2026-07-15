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

  select(): void { this.tone(520, 0.08, 'sine', 0.05); }
  place(): void { this.tone(392, 0.1, 'sine', 0.07); setTimeout(() => this.tone(587, 0.14, 'sine', 0.06), 70); }
  pickup(): void { this.tone(440, 0.07, 'triangle', 0.05, 520); }
  remove(): void { this.tone(340, 0.18, 'sine', 0.06, 160); }
  error(): void { this.tone(160, 0.14, 'square', 0.03); }
  click(): void { this.tone(680, 0.05, 'sine', 0.04); }
  shutter(): void { this.tone(1400, 0.03, 'square', 0.035); setTimeout(() => this.tone(700, 0.04, 'square', 0.03), 45); }
}

export const audio = new GameAudio();
