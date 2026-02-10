const MATERIAL_COLORS = {
  wood: '#a17344',
  glass: '#9dd5ff99',
  stone: '#8f9098',
};

const BIRD_ICON = {
  red: '#d62d2d',
  blue: '#3a7bff',
  yellow: '#f5cd1f',
  black: '#22252f',
  white: '#fafafa',
};

export const drawWorld = (ctx, world, dragState) => {
  ctx.clearRect(0, 0, world.width, world.height);
  drawBackdrop(ctx, world);
  drawSlingshot(ctx, world, dragState);
  drawQueuedBirds(ctx, world);
  drawBlocks(ctx, world);
  drawPigs(ctx, world);
  drawBirds(ctx, world);
  drawEffects(ctx, world);
  drawResultBanner(ctx, world);
};

const drawBackdrop = (ctx, world) => {
  ctx.save();
  ctx.fillStyle = '#7db7f0';
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = '#6ca145';
  ctx.fillRect(0, world.floorY, world.width, world.height - world.floorY);

  for (let i = 0; i < 24; i += 1) {
    ctx.beginPath();
    const x = i * 120 - 80;
    const y = world.floorY;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 70, y - 90 - (i % 3) * 20);
    ctx.lineTo(x + 150, y);
    ctx.fillStyle = '#548038';
    ctx.fill();
  }
  ctx.restore();
};

const drawSlingshot = (ctx, world, dragState) => {
  const { x, y } = world.slingshot;
  ctx.save();
  ctx.fillStyle = '#6e3d22';
  ctx.fillRect(x - 12, y - 80, 12, 80);
  ctx.fillRect(x + 2, y - 80, 12, 80);

  if (dragState.dragging) {
    ctx.strokeStyle = '#3f2416';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y - 48);
    ctx.lineTo(dragState.x, dragState.y);
    ctx.lineTo(x + 10, y - 48);
    ctx.stroke();
  }
  ctx.restore();
};

const drawQueuedBirds = (ctx, world) => {
  ctx.save();
  for (let i = world.activeBirdIndex + 1; i < world.birds.length; i += 1) {
    const b = world.birds[i];
    if (b.launched) continue;
    ctx.beginPath();
    ctx.arc(world.slingshot.x - (i - world.activeBirdIndex) * 45, world.floorY - 3, 11, 0, Math.PI * 2);
    ctx.fillStyle = BIRD_ICON[b.type] ?? '#d62d2d';
    ctx.fill();
  }
  ctx.restore();
};

const drawBlocks = (ctx, world) => {
  ctx.save();
  for (const block of world.blocks) {
    ctx.fillStyle = MATERIAL_COLORS[block.material] ?? '#999';
    ctx.fillRect(block.x, block.y, block.w, block.h);
    ctx.strokeStyle = '#00000044';
    ctx.strokeRect(block.x, block.y, block.w, block.h);
  }
  ctx.restore();
};

const drawPigs = (ctx, world) => {
  ctx.save();
  for (const pig of world.pigs) {
    ctx.beginPath();
    ctx.arc(pig.x, pig.y, pig.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#76d04b';
    ctx.fill();
    ctx.fillStyle = '#1f3d13';
    ctx.beginPath();
    ctx.arc(pig.x + 6, pig.y - 4, 3, 0, Math.PI * 2);
    ctx.arc(pig.x - 6, pig.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawBirds = (ctx, world) => {
  ctx.save();
  for (const bird of world.birds) {
    if (!bird.active && bird.launched) continue;
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
    ctx.fillStyle = BIRD_ICON[bird.type] ?? '#d62d2d';
    ctx.fill();
  }
  ctx.restore();
};

const drawEffects = (ctx, world) => {
  ctx.save();
  for (const fx of world.effects) {
    if (fx.type !== 'explosion') continue;
    const alpha = Math.max(0, fx.ttl / 0.32);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.radius * (1 - alpha * 0.35), 0, Math.PI * 2);
    ctx.fillStyle = '#ffb347';
    ctx.fill();
  }
  ctx.restore();
};

const drawResultBanner = (ctx, world) => {
  if (world.result === 'playing') return;

  ctx.save();
  ctx.fillStyle = '#00000077';
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(world.result === 'won' ? 'Level Cleared!' : 'Out of Birds', world.width / 2, world.height / 2 - 18);
  ctx.font = '26px system-ui';
  ctx.fillText(`Score: ${world.score}`, world.width / 2, world.height / 2 + 30);
  ctx.restore();
};
