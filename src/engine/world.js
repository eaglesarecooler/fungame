import {
  applyExplosion,
  Bird,
  Block,
  Pig,
  resolveBirdVsBlock,
  resolveBirdVsPig,
  resolvePigVsBlock,
} from './entities.js';
import { birdDecks } from '../content/birds.js';

export class GameWorld {
  constructor(levelData) {
    this.width = 1280;
    this.height = 720;
    this.floorY = this.height - 70;
    this.gravity = 620;

    this.score = 0;
    this.result = 'playing';

    this.birds = [];
    this.activeBirdIndex = 0;
    this.pigs = levelData.pigs.map((pig) => new Pig(pig.x, pig.y, pig.radius));
    this.blocks = levelData.blocks.map((block) => new Block(block));

    this.effects = [];
    this.slingshot = { x: 160, y: this.floorY - 18, radius: 16 };

    const deck = birdDecks[levelData.birdDeck] ?? birdDecks.balanced;
    for (let i = 0; i < deck.length; i += 1) {
      const bird = new Bird(deck[i], this.slingshot.x - i * 44, this.slingshot.y + 4);
      this.birds.push(bird);
    }
  }

  get activeBird() {
    return this.birds[this.activeBirdIndex] ?? null;
  }

  launchActiveBird(vx, vy) {
    const bird = this.activeBird;
    if (!bird || bird.launched) return;
    bird.x = this.slingshot.x;
    bird.y = this.slingshot.y;
    bird.launch(vx, vy);
  }

  selectNextBird() {
    while (this.activeBirdIndex < this.birds.length) {
      const b = this.birds[this.activeBirdIndex];
      if (!b.launched || b.active) return;
      this.activeBirdIndex += 1;
      const next = this.birds[this.activeBirdIndex];
      if (next) {
        next.x = this.slingshot.x;
        next.y = this.slingshot.y;
      }
    }
  }

  splitBird(baseBird) {
    const childA = new Bird('blue', baseBird.x, baseBird.y - 10);
    const childB = new Bird('blue', baseBird.x, baseBird.y + 10);
    childA.launch(baseBird.vx + 30, baseBird.vy - 80);
    childB.launch(baseBird.vx + 30, baseBird.vy + 80);
    this.birds.push(childA, childB);
  }

  queueExplosion(x, y, radius, force) {
    this.effects.push({ type: 'explosion', x, y, radius, ttl: 0.32 });
    applyExplosion(this, x, y, radius, force);
  }

  dropEgg(x, y) {
    this.queueExplosion(x, y + 70, 95, 145);
  }

  update(dt) {
    if (this.result !== 'playing') return;

    for (const bird of this.birds) {
      bird.update(dt, this.gravity, this.width, this.height);
    }

    for (const pig of this.pigs) {
      pig.update(dt, this.gravity, this.floorY);
    }

    for (const block of this.blocks) {
      block.update(dt, this.gravity, this.floorY);
    }

    const activeBirds = this.birds.filter((bird) => bird.active && bird.launched);
    for (const bird of activeBirds) {
      for (const pig of this.pigs) {
        this.score += resolveBirdVsPig(bird, pig);
      }
      for (const block of this.blocks) {
        this.score += resolveBirdVsBlock(bird, block);
      }
    }

    for (const pig of this.pigs) {
      for (const block of this.blocks) {
        resolvePigVsBlock(pig, block);
      }
    }

    this.pigs = this.pigs.filter((pig) => pig.alive);
    this.blocks = this.blocks.filter((block) => block.alive);

    for (const effect of this.effects) {
      effect.ttl -= dt;
    }
    this.effects = this.effects.filter((effect) => effect.ttl > 0);

    if (this.pigs.length === 0) {
      this.result = 'won';
      this.score += 5000;
    }

    this.selectNextBird();
    if (this.activeBirdIndex >= this.birds.length && this.pigs.length > 0) {
      this.result = 'lost';
    }
  }
}
