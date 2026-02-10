import { campaignLevels } from './content/levels.js';
import { GameWorld } from './engine/world.js';
import { clamp, length } from './engine/math.js';
import { drawWorld } from './render/draw.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const levelLabel = document.getElementById('levelLabel');
const birdLabel = document.getElementById('birdLabel');
const scoreLabel = document.getElementById('scoreLabel');
const pigLabel = document.getElementById('pigLabel');

const restartBtn = document.getElementById('restartBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

let levelIndex = 0;
let world = new GameWorld(campaignLevels[levelIndex]);

const dragState = {
  dragging: false,
  x: world.slingshot.x,
  y: world.slingshot.y,
};

const loadLevel = (index) => {
  levelIndex = (index + campaignLevels.length) % campaignLevels.length;
  world = new GameWorld(campaignLevels[levelIndex]);
  updateHud();
};

const updateHud = () => {
  levelLabel.textContent = `${levelIndex + 1} / ${campaignLevels.length}`;
  scoreLabel.textContent = `${Math.floor(world.score)}`;
  pigLabel.textContent = `${world.pigs.length}`;
  birdLabel.textContent = world.activeBird ? world.activeBird.type : '-';
};

const toCanvasPoint = (event) => {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * sx,
    y: (event.clientY - rect.top) * sy,
  };
};

const onPointerDown = (event) => {
  if (world.result !== 'playing') return;
  const p = toCanvasPoint(event);
  const bird = world.activeBird;
  if (!bird || bird.launched) return;

  const dx = p.x - world.slingshot.x;
  const dy = p.y - world.slingshot.y;
  if (length(dx, dy) > 60) return;

  dragState.dragging = true;
  dragState.x = p.x;
  dragState.y = p.y;
};

const onPointerMove = (event) => {
  if (!dragState.dragging) return;
  const p = toCanvasPoint(event);
  const dx = p.x - world.slingshot.x;
  const dy = p.y - world.slingshot.y;
  const dist = length(dx, dy);
  const max = 130;
  if (dist > max) {
    const scale = max / dist;
    dragState.x = world.slingshot.x + dx * scale;
    dragState.y = world.slingshot.y + dy * scale;
  } else {
    dragState.x = p.x;
    dragState.y = p.y;
  }
};

const onPointerUp = () => {
  if (!dragState.dragging) return;
  dragState.dragging = false;

  const dx = world.slingshot.x - dragState.x;
  const dy = world.slingshot.y - dragState.y;
  const launchScale = 5.2;
  const vx = clamp(dx * launchScale, -620, 620);
  const vy = clamp(dy * launchScale, -700, 700);

  world.launchActiveBird(vx, vy);
  dragState.x = world.slingshot.x;
  dragState.y = world.slingshot.y;
};

canvas.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    world.activeBird?.triggerAbility(world);
  }
  if (event.code === 'KeyR') loadLevel(levelIndex);
});

restartBtn.addEventListener('click', () => loadLevel(levelIndex));
prevBtn.addEventListener('click', () => loadLevel(levelIndex - 1));
nextBtn.addEventListener('click', () => loadLevel(levelIndex + 1));

let lastTime = performance.now();
const tick = (now) => {
  const dt = Math.min(1 / 30, (now - lastTime) / 1000);
  lastTime = now;

  world.update(dt);
  updateHud();
  drawWorld(ctx, world, dragState);

  if (world.result === 'won') {
    nextBtn.classList.add('pulse');
  } else {
    nextBtn.classList.remove('pulse');
  }

  requestAnimationFrame(tick);
};

updateHud();
requestAnimationFrame(tick);
