/**
 * Creates canvas-based icons for Mapbox addImage().
 * Food & Drink: Amber circle with knife-fork icon
 * Health & Nutrition: Teal circle with heart icon
 */

const SIZE = 32; // px (rendered at 2x for retina)
const HALF = SIZE / 2;

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  return canvas;
}

function drawCircle(ctx: CanvasRenderingContext2D, color: string) {
  ctx.beginPath();
  ctx.arc(HALF, HALF, HALF - 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawKnifeFork(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#121212';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  // Fork (left)
  ctx.beginPath();
  ctx.moveTo(11, 9);
  ctx.lineTo(11, 23);
  ctx.stroke();

  // Fork tines
  ctx.beginPath();
  ctx.moveTo(9, 9);
  ctx.lineTo(9, 14);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(13, 9);
  ctx.lineTo(13, 14);
  ctx.stroke();

  // Knife (right)
  ctx.beginPath();
  ctx.moveTo(21, 9);
  ctx.lineTo(21, 23);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(19, 9);
  ctx.quadraticCurveTo(19, 16, 21, 16);
  ctx.stroke();
}

function drawHeart(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#121212';
  ctx.beginPath();
  const x = HALF;
  const y = HALF + 1;
  const s = 6;
  ctx.moveTo(x, y + s * 0.5);
  ctx.bezierCurveTo(x - s * 1.5, y - s * 0.5, x - s * 1.5, y - s * 1.2, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 1.5, y - s * 1.2, x + s * 1.5, y - s * 0.5, x, y + s * 0.5);
  ctx.fill();
}

export function createFoodDrinkIcon(): HTMLCanvasElement {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d')!;
  drawCircle(ctx, '#E8A838'); // Amber
  drawKnifeFork(ctx);
  return canvas;
}

export function createHealthNutritionIcon(): HTMLCanvasElement {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d')!;
  drawCircle(ctx, '#2DD4BF'); // Teal
  drawHeart(ctx);
  return canvas;
}
