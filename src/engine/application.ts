import { Ticker } from './ticker';

import type { Sprite } from './sprite';
import type { TickerListener, Time } from './ticker';

interface ApplicationOptions {
  /**
   * CSS selector used to find the root DOM element where the canvas is mounted.
   */
  rootElementSelector: string;
  /** Canvas width in pixels. */
  width: number;
  /** Canvas height in pixels. */
  height: number;
  /** Canvas background color/style. */
  background: string;
  /** Target frames per second for the internal ticker. Defaults to `60`. */
  fps?: number;
}

/**
 * Main 2D canvas application container.
 *
 * `Application` owns the render canvas, sprite registry, and frame ticker.
 * It extends `EventTarget` and dispatches a custom `'click'` event with
 * canvas-relative coordinates: `{ x: number, y: number }`.
 *
 * @example
 * const app = new Application({
 *   rootElementSelector: '#app',
 *   width: 800,
 *   height: 600,
 *   background: '#f0f0f0',
 *   fps: 30,
 * });
 *
 * app.addEventListener('click', (event) => {
 *   const click = event as CustomEvent<{ x: number; y: number }>;
 *   console.log(click.detail.x, click.detail.y);
 * });
 */
export class Application extends EventTarget {
  private rootElement: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;

  private canvasContext: CanvasRenderingContext2D | null = null;

  private width: number;
  private height: number;
  private background: string;

  private sprites = new Map<string, Sprite>();

  private ticker: Ticker;

  /**
   * Creates a new application instance and prepares the ticker.
   *
   * Note: the canvas is not created until {@link initialize} is called.
   *
   * @throws {Error} If `rootElementSelector` does not match any DOM element.
   */
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

  /**
   * Creates and mounts the canvas, wires DOM events, and starts the game loop.
   *
   * Call this once after registering sprites and tick listeners.
   *
   * @throws {Error} If a 2D canvas rendering context cannot be created.
   */
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

  /**
   * Registers a sprite instance under a name.
   *
   * If the name already exists, the previous sprite is replaced.
   */
  public registerSprite(name: string, sprite: Sprite) {
    this.sprites.set(name, sprite);
  }

  /**
   * Deregisters a sprite by name.
   */
  public removeSprite(name: string) {
    this.sprites.delete(name);
  }

  /**
   * Returns a previously registered sprite by name.
   */
  public getSprite(name: string) {
    return this.sprites.get(name);
  }

  /**
   * Subscribes a listener to ticker updates.
   *
   * The listener is called every frame with timing metadata.
   * Returns a cleanup function that removes the listener.
   */
  public onTick(listener: TickerListener) {
    return this.ticker.addListener(listener);
  }
}
