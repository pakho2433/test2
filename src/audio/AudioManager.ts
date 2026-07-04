/**
 * Fully procedural WebAudio manager — no external audio files are fetched,
 * so the game never breaks due to missing/blocked audio assets. Ambience is
 * generated from filtered noise loops; SFX are short synthesized blips.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private riverAmbience: { stop: () => void } | null = null;
  private marketAmbience: { stop: () => void } | null = null;
  private indoorAmbience: { stop: () => void } | null = null;
  private unlocked = false;

  masterVolume = 0.8;
  sfxVolume = 0.8;
  musicVolume = 0.6;

  init(): void {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);
    } catch (err) {
      console.warn('[AudioManager] WebAudio unavailable, running without sound.', err);
      this.ctx = null;
    }
  }

  /** Must be called from a user gesture (mobile browsers restrict autoplay). */
  unlock(): void {
    if (!this.ctx || this.unlocked) return;
    this.ctx.resume?.().catch(() => {});
    this.unlocked = true;
  }

  setVolumes(master: number, sfx: number, music: number): void {
    this.masterVolume = master;
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (!this.ctx) return;
    this.masterGain.gain.value = master;
    this.sfxGain.gain.value = sfx;
    this.musicGain.gain.value = music;
  }

  private makeNoiseBuffer(seconds: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private startNoiseAmbience(freq: number, q: number, gainValue: number): { stop: () => void } | null {
    if (!this.ctx) return null;
    const buffer = this.makeNoiseBuffer(4);
    if (!buffer) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start();
    return { stop: () => src.stop() };
  }

  startRiverAmbience(): void {
    if (this.riverAmbience) return;
    this.riverAmbience = this.startNoiseAmbience(500, 0.6, 0.18);
  }

  startMarketAmbience(): void {
    if (this.marketAmbience) return;
    this.marketAmbience = this.startNoiseAmbience(1400, 0.4, 0.1);
  }

  setIndoor(indoor: boolean): void {
    if (indoor) {
      if (!this.indoorAmbience) this.indoorAmbience = this.startNoiseAmbience(300, 1.2, 0.08);
      this.marketAmbience?.stop();
      this.marketAmbience = null;
    } else {
      this.indoorAmbience?.stop();
      this.indoorAmbience = null;
      if (!this.marketAmbience) this.startMarketAmbience();
    }
  }

  private blip(freq: number, duration: number, type: OscillatorType = 'sine', gainValue = 0.25): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.value = gainValue;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  footstep(): void {
    if (!this.ctx) return;
    const buffer = this.makeNoiseBuffer(0.08);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.18;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start();
  }

  doorSound(open: boolean): void {
    this.blip(open ? 220 : 160, 0.25, 'sawtooth', 0.12);
  }

  itemCollectSound(): void {
    this.blip(660, 0.12, 'sine', 0.2);
    setTimeout(() => this.blip(880, 0.12, 'sine', 0.18), 90);
  }

  missionProgressSound(): void {
    this.blip(440, 0.15, 'triangle', 0.2);
    setTimeout(() => this.blip(550, 0.18, 'triangle', 0.2), 120);
  }

  missionCompleteSound(): void {
    [440, 550, 660, 880].forEach((f, i) => setTimeout(() => this.blip(f, 0.2, 'triangle', 0.22), i * 110));
  }

  uiClickSound(): void {
    this.blip(300, 0.05, 'square', 0.08);
  }
}
