import { Ticker } from './ticker';

import type { Sprite } from './sprite';
import type { TickerListener, Time } from './ticker';

interface ApplicationOptions {
  rootElementSelector: string;
  width: number;
  height: number;
  background: string;
  fps?: number;
}

export class Application extends EventTarget {
  private rootElement: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;

  private canvasContext: CanvasRenderingContext2D | null = null;

  private width: number;
  private height: number;
  private background: string;

  private sprites = new Map<string, Sprite>();

  private ticker: Ticker;

  constructor({
    rootElementSelector,
    width,
    height,
    background,
    fps = 60,
  }: ApplicationOptions) {
    super();

    const rootElement = document.querySelector(rootElementSelector);
    if (!rootElement) {
      throw new Error(
        `Root element not found for selector: ${rootElementSelector}`,
      );
    }

    this.rootElement = rootElement as HTMLElement;
    this.width = width;
    this.height = height;
    this.background = background;

    this.ticker = new Ticker(fps);
  }

  private tick(time: Time) {
    if (!this.canvasContext) {
      return;
    }

    this.canvasContext.clearRect(0, 0, this.width, this.height);

    for (const sprite of this.sprites.values()) {
      sprite.tick(time.current, this.canvasContext);
    }
  }

  private canvasClickHandler(event: MouseEvent) {
    if (!this.canvas) {
      return;
    }

    const boundingRectangle = this.canvas.getBoundingClientRect();
    const canvasClickX = event.clientX - boundingRectangle.left;
    const canvasClickY = event.clientY - boundingRectangle.top;

    const clickEvent = new CustomEvent('click', {
      detail: { x: canvasClickX, y: canvasClickY },
    });

    this.dispatchEvent(clickEvent);

    for (const sprite of this.sprites.values()) {
      sprite.notifyClick(new DOMPoint(canvasClickX, canvasClickY));
    }
  }

  public initialize() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.background = this.background;
    this.canvas.style.backgroundSize = 'cover';

    this.rootElement.appendChild(this.canvas);

    this.canvas.addEventListener('click', this.canvasClickHandler.bind(this));

    this.canvasContext = this.canvas.getContext('2d');

    if (!this.canvasContext) {
      throw new Error('Failed to get canvas context');
    }

    this.canvasContext.imageSmoothingEnabled = false;

    this.ticker.addListener(this.tick.bind(this));
    this.ticker.start();
  }

  public registerSprite(name: string, sprite: Sprite) {
    this.sprites.set(name, sprite);
  }

  public getSprite(name: string) {
    return this.sprites.get(name);
  }

  public onTick(listener: TickerListener) {
    return this.ticker.addListener(listener);
  }
}
