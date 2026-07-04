export interface GameSettings {
  masterVolume: number; // 0-1
  sfxVolume: number;
  musicVolume: number;
  mouseSensitivity: number; // 0-1
  textScale: number; // 0.8 - 1.5
  quality: 'high' | 'medium' | 'low';
  subtitles: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  screenShake: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.8,
  musicVolume: 0.6,
  mouseSensitivity: 0.5,
  textScale: 1.0,
  quality: 'medium',
  subtitles: true,
  reducedMotion: false,
  highContrast: false,
  screenShake: true,
};

export function applySettingsToDocument(settings: GameSettings): void {
  document.documentElement.style.setProperty('--ui-text-scale', String(settings.textScale));
  document.body.classList.toggle('high-contrast', settings.highContrast);
}
