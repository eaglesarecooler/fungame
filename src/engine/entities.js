import { clamp, distance, normalize, rectsOverlap } from './math.js';

const MATERIAL_DENSITY = {
  wood: 1.0,
  stone: 1.9,
  glass: 0.6,
};

const MATERIAL_HEALTH = {
  wood: 130,
  stone: 240,
  glass: 75,
};

const BIRD_PROFILES = {
  red: { radius: 18, power: 1.0, color: '#d62d2d' },
  blue: { radius: 12, power: 0.78, color: '#3a7bff' },
  yellow: { radius: 14, power: 0.84, color: '#f5cd1f' },
  black: { radius: 20, power: 1.45, color: '#2e2f35' },
  white: { radius: 16, power: 0.9, color: '#f1f1f1' },
};

export class Bird {
  constructor(type, x, y) {
    const profile = BIRD_PROFILES[type] ?? BIRD_PROFILES.red;
    this.kind = 'bird';
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = profile.radius;
    this.power = profile.power;
    this.color = profile.color;
    this.launched = false;
    this.active = true;
    this.abilityUsed = false;
    this.restTimer = 0;
    this.mass = profile.radius * 0.5;
  }

  launch(vx, vy) {
    this.vx = vx;
    this.vy = vy;
    this.launched = true;
  }

  update(dt, gravity, worldWidth, worldHeight) {
    if (!this.active || !this.launched) return;

    this.vy += gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y + this.radius > worldHeight - 70) {
      this.y = worldHeight - 70 - this.radius;
      this.vy *= -0.25;
      this.vx *= 0.87;
    }

    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx *= -0.35;
    }
    if (this.x + this.radius > worldWidth) {
      this.x = worldWidth - this.radius;
      this.vx *= -0.35;
    }

    const speedSq = this.vx * this.vx + this.vy * this.vy;
    if (speedSq < 20) {
      this.restTimer += dt;
      if (this.restTimer > 2.2) {
        this.active = false;
      }
    } else {
      this.restTimer = 0;
    }
  }

  triggerAbility(world) {
    if (this.abilityUsed || !this.launched || !this.active) return;
    this.abilityUsed = true;

    if (this.type === 'yellow') {
      const dir = normalize(this.vx, this.vy);
      this.vx += dir.x * 220;
      this.vy += dir.y * 220;
      return;
    }

    if (this.type === 'blue') {
      world.splitBird(this);
      return;
    }

    if (this.type === 'black') {
      world.queueExplosion(this.x, this.y, 120, 170);
      this.active = false;
      return;
    }

    if (this.type === 'white') {
      world.dropEgg(this.x, this.y);
      return;
    }
  }
}

export class Pig {
  constructor(x, y, radius = 20) {
    this.kind = 'pig';
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.health = radius * 7;
    this.alive = true;
    this.mass = radius * 0.65;
  }

  update(dt, gravity, floorY) {
    if (!this.alive) return;
    this.vy += gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y + this.radius > floorY) {
      this.y = floorY - this.radius;
      this.vy *= -0.2;
      this.vx *= 0.8;
    }

    if (Math.abs(this.vx) < 1) this.vx = 0;
  }

  damage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
    }
  }
}

export class Block {
  constructor({ x, y, w, h, material, angle = 0 }) {
    this.kind = 'block';
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.material = material;
    this.angle = angle;
    this.vx = 0;
    this.vy = 0;
    this.mass = (w * h * (MATERIAL_DENSITY[material] ?? 1)) / 1200;
    this.health = MATERIAL_HEALTH[material] ?? 100;
    this.alive = true;
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt, gravity, floorY) {
    if (!this.alive) return;
    this.vy += gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y + this.h > floorY) {
      this.y = floorY - this.h;
      this.vy *= -0.15;
      this.vx *= 0.84;
    }

    if (Math.abs(this.vx) < 1) this.vx = 0;
  }

  damage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
    }
  }
}

export const resolveBirdVsPig = (bird, pig) => {
  if (!pig.alive || !bird.active) return 0;
  const d = distance(bird.x, bird.y, pig.x, pig.y);
  const overlap = bird.radius + pig.radius - d;
  if (overlap <= 0) return 0;

  const impact = Math.sqrt(bird.vx * bird.vx + bird.vy * bird.vy) * bird.mass * bird.power;
  pig.damage(impact * 0.08);

  const n = normalize(pig.x - bird.x, pig.y - bird.y);
  pig.vx += n.x * impact * 0.05;
  pig.vy += n.y * impact * 0.05;
  bird.vx -= n.x * impact * 0.02;
  bird.vy -= n.y * impact * 0.02;
  return pig.alive ? 80 : 1000;
};

export const resolveBirdVsBlock = (bird, block) => {
  if (!block.alive || !bird.active) return 0;
  const closestX = clamp(bird.x, block.x, block.x + block.w);
  const closestY = clamp(bird.y, block.y, block.y + block.h);
  const dx = bird.x - closestX;
  const dy = bird.y - closestY;
  const distSq = dx * dx + dy * dy;
  const radiusSq = bird.radius * bird.radius;
  if (distSq > radiusSq) return 0;

  const dist = Math.sqrt(Math.max(0.0001, distSq));
  const penetration = bird.radius - dist;
  const n = distSq < 0.0001 ? { x: 0, y: -1 } : { x: dx / dist, y: dy / dist };
  bird.x += n.x * penetration;
  bird.y += n.y * penetration;

  const impact = Math.sqrt(bird.vx * bird.vx + bird.vy * bird.vy) * bird.mass * bird.power;
  const vn = bird.vx * n.x + bird.vy * n.y;
  if (vn < 0) {
    const bounce = 0.28;
    const impulse = -(1 + bounce) * vn;
    bird.vx += impulse * n.x;
    bird.vy += impulse * n.y;
    block.vx -= n.x * impact * 0.007;
    block.vy -= n.y * impact * 0.007;
  }

  if (impact > 130) {
    block.damage((impact - 130) * 0.026);
  }

  return block.alive ? 55 : 450;
};

export const resolvePigVsBlock = (pig, block) => {
  if (!pig.alive || !block.alive) return;
  const pigBox = {
    x: pig.x - pig.radius,
    y: pig.y - pig.radius,
    w: pig.radius * 2,
    h: pig.radius * 2,
  };
  if (!rectsOverlap(pigBox, block.rect)) return;

  const overlapX = Math.min(
    pigBox.x + pigBox.w - block.x,
    block.x + block.w - pigBox.x,
  );
  const overlapY = Math.min(
    pigBox.y + pigBox.h - block.y,
    block.y + block.h - pigBox.y,
  );

  if (overlapY < overlapX) {
    const dir = pig.y < block.y ? -1 : 1;
    pig.y -= overlapY * dir;
    pig.vy *= -0.2;
  } else {
    const dir = pig.x < block.x ? -1 : 1;
    pig.x -= overlapX * dir;
    pig.vx *= -0.2;
  }

  const impact = Math.sqrt(pig.vx * pig.vx + pig.vy * pig.vy) * pig.mass;
  if (impact > 35) {
    block.damage((impact - 35) * 0.01);
    pig.damage((impact - 35) * 0.006);
  }
};

export const resolveBlockVsBlock = (a, b) => {
  if (!a.alive || !b.alive) return;
  if (!rectsOverlap(a.rect, b.rect)) return;

  const overlapX = Math.min(a.x + a.w - b.x, b.x + b.w - a.x);
  const overlapY = Math.min(a.y + a.h - b.y, b.y + b.h - a.y);
  const invMassA = 1 / Math.max(0.001, a.mass);
  const invMassB = 1 / Math.max(0.001, b.mass);
  const totalInvMass = invMassA + invMassB;

  if (overlapY <= overlapX) {
    const dir = a.y < b.y ? -1 : 1;
    const correction = overlapY;
    a.y -= (correction * invMassA / totalInvMass) * dir;
    b.y += (correction * invMassB / totalInvMass) * dir;

    const relativeVy = a.vy - b.vy;
    const impulse = relativeVy * 0.3;
    a.vy -= impulse * invMassA;
    b.vy += impulse * invMassB;
  } else {
    const dir = a.x < b.x ? -1 : 1;
    const correction = overlapX;
    a.x -= (correction * invMassA / totalInvMass) * dir;
    b.x += (correction * invMassB / totalInvMass) * dir;

    const relativeVx = a.vx - b.vx;
    const impulse = relativeVx * 0.2;
    a.vx -= impulse * invMassA;
    b.vx += impulse * invMassB;
  }

  const impact = Math.hypot(a.vx - b.vx, a.vy - b.vy) * Math.min(a.mass, b.mass);
  if (impact > 70) {
    const damage = (impact - 70) * 0.008;
    a.damage(damage);
    b.damage(damage);
  }
};

export const applyExplosion = (world, x, y, radius, force) => {
  for (const entity of [...world.pigs, ...world.blocks]) {
    if (!entity.alive) continue;

    const cx = entity.kind === 'block' ? entity.x + entity.w / 2 : entity.x;
    const cy = entity.kind === 'block' ? entity.y + entity.h / 2 : entity.y;
    const d = distance(x, y, cx, cy);
    if (d > radius) continue;

    const strength = (1 - clamp(d / radius, 0, 1)) * force;
    const n = normalize(cx - x, cy - y);
    entity.vx += n.x * strength * 0.8;
    entity.vy += n.y * strength * 0.8;
    entity.damage(strength * 0.7);
  }
};
