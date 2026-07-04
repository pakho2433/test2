import './style.css';
import { Game } from './core/Game';
import { installRuntimePatches } from './core/RuntimePatches';

function showFatalError(message: string): void {
  const app = document.getElementById('app');
  if (!app) return;
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;background:#140d05;color:#f3e6c8;font-family:sans-serif;text-align:center;padding:2rem;';
  overlay.innerHTML = `<div><h2>清明河畔 · Qingming Riverside</h2><p>${message}</p><p style="opacity:0.7;font-size:0.85rem">請嘗試重新整理頁面，或改用支援 WebGL 的瀏覽器。<br/>Please try refreshing the page or use a browser that supports WebGL.</p></div>`;
  app.appendChild(overlay);
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
}

async function bootstrap(): Promise<void> {
  if (!isWebGLAvailable()) {
    showFatalError(
      '您的瀏覽器不支援 WebGL，無法執行本遊戲。<br/>Your browser does not support WebGL, which is required to run this game.',
    );
    return;
  }
  try {
    const game = new Game();
    await game.start();
  } catch (err) {
    console.error('[main] Fatal startup error:', err);
    showFatalError('遊戲載入時發生錯誤。 An error occurred while loading the game.');
  }
}

installRuntimePatches();
bootstrap();
