/**
 * Sound Effects Engine using Web Audio API
 * Generates crisp, pleasant, modern haptic-like UI audio feedback
 * Zero external dependencies, 100% offline, zero latency.
 */

class SoundEffectsEngine {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Check localStorage preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_sound_enabled');
      if (saved !== null) {
        this.soundEnabled = saved === 'true';
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_sound_enabled', String(enabled));
    }
  }

  public toggle(): boolean {
    const next = !this.soundEnabled;
    this.setEnabled(next);
    if (next) {
      this.playIncrease();
    }
    return next;
  }

  /**
   * Modern, crisp, high-tech affirmative chime for increasing quantity (+)
   * Fast, snappy, crystalline pop like modern smartphone OS / futuristic UI
   */
  public playIncrease() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Master Gain for smooth volume
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.32, now);
      masterGain.connect(ctx.destination);

      // 1. High-tech tactile transient click (crisp initial snap, 15ms)
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(2400, now);
      clickOsc.frequency.exponentialRampToValueAtTime(1400, now + 0.015);

      clickGain.gain.setValueAtTime(0.001, now);
      clickGain.gain.linearRampToValueAtTime(0.28, now + 0.003);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      clickOsc.connect(clickGain);
      clickGain.connect(masterGain);

      // 2. Primary modern melodic tone - swift upward futuristic glide (880Hz -> 1320Hz)
      const primaryOsc = ctx.createOscillator();
      const primaryGain = ctx.createGain();
      primaryOsc.type = 'sine';
      primaryOsc.frequency.setValueAtTime(880, now);
      primaryOsc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.045); // A5 to E6 (clean fifth)

      primaryGain.gain.setValueAtTime(0.001, now);
      primaryGain.gain.linearRampToValueAtTime(0.36, now + 0.006);
      primaryGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      primaryOsc.connect(primaryGain);
      primaryGain.connect(masterGain);

      // 3. Ultra-clean glass harmonic overtone (crystal sheen)
      const sheenOsc = ctx.createOscillator();
      const sheenGain = ctx.createGain();
      sheenOsc.type = 'sine';
      sheenOsc.frequency.setValueAtTime(1760, now);
      sheenOsc.frequency.exponentialRampToValueAtTime(2637, now + 0.035);

      sheenGain.gain.setValueAtTime(0.001, now);
      sheenGain.gain.linearRampToValueAtTime(0.12, now + 0.004);
      sheenGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      sheenOsc.connect(sheenGain);
      sheenGain.connect(masterGain);

      clickOsc.start(now);
      clickOsc.stop(now + 0.02);
      primaryOsc.start(now);
      primaryOsc.stop(now + 0.08);
      sheenOsc.start(now);
      sheenOsc.stop(now + 0.065);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Modern negative/subtractive sound for decreasing quantity (-)
   * Sleek, low-pitch descending tech blip with a subtle negative/diminish character
   */
  public playDecrease() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.3, now);
      masterGain.connect(ctx.destination);

      // Low-pass filter to give that sleek, damped "negative subtraction" quality
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + 0.07);
      filter.Q.setValueAtTime(2.2, now); // subtle resonance for high-tech negative character
      filter.connect(masterGain);

      // 1. Sleek downward negative sweep (starts at 440Hz and quickly drops to 210Hz)
      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweepOsc.type = 'triangle'; // triangle gives a richer, modern synthetic body
      sweepOsc.frequency.setValueAtTime(440, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(207.65, now + 0.065); // Ab3/G#3 flat minor feel

      sweepGain.gain.setValueAtTime(0.001, now);
      sweepGain.gain.linearRampToValueAtTime(0.42, now + 0.005);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      sweepOsc.connect(filter);

      // 2. Secondary damped sub-tap (solid negative tactile thud)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(260, now);
      subOsc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.25, now + 0.004);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      subOsc.connect(masterGain);

      sweepOsc.start(now);
      sweepOsc.stop(now + 0.085);
      subOsc.start(now);
      subOsc.stop(now + 0.065);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Subtle soft click/thud when hitting minimum limit (1) or disabled
   */
  public playLimit() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.05);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    } catch {}
  }

  /**
   * Rewarding melodic chime when adding item to cart / invoice ("إدراج بالفاتورة")
   */
  public playAddToCart() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 987.77]; // E5 -> B5 (cheerful major interval)

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.22, noteStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.13);
      });
    } catch {}
  }

  /**
   * Cash register / victory chime when completing sale invoice
   */
  public playInvoiceSuccess() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major chord arpeggio

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.045;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.25);
      });
    } catch {}
  }

  public playSuccess() {
    this.playInvoiceSuccess();
  }

  public success() {
    this.playInvoiceSuccess();
  }

  public playBeep() {
    this.playIncrease();
  }

  public beep() {
    this.playIncrease();
  }
}

export const soundEffects = new SoundEffectsEngine();
