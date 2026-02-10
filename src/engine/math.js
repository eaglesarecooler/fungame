export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const length = (x, y) => Math.sqrt(x * x + y * y);

export const normalize = (x, y) => {
  const len = length(x, y) || 1;
  return { x: x / len, y: y / len };
};

export const distance = (ax, ay, bx, by) => length(ax - bx, ay - by);

export const rectsOverlap = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;
