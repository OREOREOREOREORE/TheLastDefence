import type { BaseObject } from './base-object';

type CircleMode = 'fill' | 'stroke' | 'clip';

export class Circle implements BaseObject {
  private mode: CircleMode = 'fill';
  private fillStyle = '#000';
  private strokeStyle = '#000';

  private isHidden = false;

  public canvasX: number;
  public canvasY: number;
  public radius: number;

  constructor(x: number, y: number, radius: number) {
    this.canvasX = x;
    this.canvasY = y;
    this.radius = radius;
  }

  public setMode(mode: CircleMode) {
    this.mode = mode;
  }

  public setFillStyle(fillStyle: string) {
    if (this.mode === 'fill') {
      this.fillStyle = fillStyle;
    }
  }

  public hide() {
    this.isHidden = true;
  }

  public show() {
    this.isHidden = false;
  }

  public hidden() {
    return this.isHidden;
  }

  public setStrokeStyle(strokeStyle: string) {
    if (this.mode === 'stroke') {
      this.strokeStyle = strokeStyle;
    }
  }

  public tick(_time: number, context: CanvasRenderingContext2D) {
    if (this.isHidden) {
      return;
    }

    if (this.mode !== 'clip') {
      context.save();

      context.fillStyle = this.fillStyle;
      context.strokeStyle = this.strokeStyle;
    }

    context.beginPath();
    context.arc(this.canvasX, this.canvasY, this.radius, 0, Math.PI * 2);

    switch (this.mode) {
      case 'fill':
        context.fill();
        break;
      case 'stroke':
        context.stroke();
        break;
      case 'clip':
        // Draw a dark overlay
        context.fillStyle = '#000';
        context.rect(0, 0, context.canvas.width, context.canvas.height);
        context.fill('evenodd');

        context.fillStyle = this.fillStyle;
        // Set the clipping region to the circle
        context.beginPath();
        context.arc(this.canvasX, this.canvasY, this.radius, 0, Math.PI * 2);

        context.clip();
        break;
    }

    if (this.mode !== 'clip') {
      context.restore();
    }
  }

  public notifyClick(point: DOMPoint) {
    console.log(`Circle clicked at (${point.x}, ${point.y})`);
  }
}
