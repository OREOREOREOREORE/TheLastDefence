import { Ticker } from './ticker';

import type { TickerListener, Time } from './ticker';
import type { BaseObject } from './base-object';

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

  private objects = new Map<string, BaseObject>();

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

    // Save the global context for restoration. Some operation like clipping does not (and should not) automatically restore
    this.canvasContext.save();

    this.canvasContext.clearRect(0, 0, this.width, this.height);

    for (const sprite of this.objects.values()) {
      sprite.tick(time.current, this.canvasContext);
    }

    this.canvasContext.restore();
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

    for (const object of this.objects.values()) {
      object.notifyClick(new DOMPoint(canvasClickX, canvasClickY));
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
   * Registers an object instance under a name.
   *
   * If the name already exists, the previous object is replaced.
   */
  public registerObject(name: string, object: BaseObject) {
    this.objects.set(name, object);
  }

  /**
   * Deregisters an object by name.
   */
  public removeObject(name: string) {
    this.objects.delete(name);
  }

  /**
   * Returns a previously registered object by name.
   */
  public getObject(name: string) {
    return this.objects.get(name);
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

  /**
   * Gets the bounding rectangle of the canvas in page coordinates.
   * @returns The bounding rectangle of the canvas, or `undefined` if the canvas is not initialized.
   */
  public getCanvasRect() {
    return this.canvas?.getBoundingClientRect();
  }

  public saveContextState() {
    this.canvasContext?.save();
  }

  public restoreContextState() {
    this.canvasContext?.restore();
  }
}
