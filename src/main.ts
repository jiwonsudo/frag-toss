import { Game } from './core/Game';
import { initPhysics } from './gameplay/PhysicsWorld';
import { preloadModels } from './gameplay/models';

async function bootstrap(): Promise<void> {
  await Promise.all([initPhysics(), preloadModels()]);

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const ui = document.getElementById('ui') as HTMLElement;
  const game = new Game(canvas, ui);
  game.start();
}

bootstrap().catch((err) => {
  console.error(err);
  const ui = document.getElementById('ui');
  if (ui) ui.innerHTML = `<div class="ui-center"><p class="ui-sub">초기화 실패: ${err}</p></div>`;
});
