/**
 * Timing metadata passed to ticker listeners.
 */
export interface Time {
  /** Milliseconds elapsed since the previous processed tick. */
  delta: number;
  /** High-resolution current timestamp from `requestAnimationFrame`. */
  current: number;
}

/**
 * Callback invoked whenever the ticker processes a frame.
 */
export type TickerListener = (time: Time) => void;

/**
 * Frame ticker built on top of `requestAnimationFrame` with FPS throttling.
 *
 * Register listeners with {@link addListener}, then call {@link start} to begin
 * dispatching updates.
 */
export class Ticker {
  private lastTickTime = 0;
  private fps: number;
  private listeners = new Map<number, TickerListener>();

  private listenerIdBase = 0;

  private started = false;

  /**
   * Creates a ticker with a target frame rate.
   */
  constructor(fps = 60) {
    this.fps = fps;
  }

  private tick(time: Time) {
    const delta = time.current - this.lastTickTime;

    if (!this.started) {
      requestAnimationFrame((currentTime) => {
        this.tick({ delta, current: currentTime });
      });

      return;
    }

    // Ensure we only update at the requested FPS
    if (delta < 1000 / this.fps) {
      requestAnimationFrame((currentTime) => {
        this.tick({ delta, current: currentTime });
      });

      return;
    }

    this.lastTickTime = time.current;

    for (const listener of this.listeners.values()) {
      listener(time);
    }

    requestAnimationFrame((currentTime) => {
      this.tick({ delta, current: currentTime });
    });
  }

  /**
   * Subscribes a listener and returns its numeric id.
   */
  public addListener(listener: TickerListener) {
    const id = this.listenerIdBase;
    this.listeners.set(id, listener);
    this.listenerIdBase++;

    return id;
  }

  /**
   * Unsubscribes a listener by id.
   */
  public removeListener(id: number) {
    this.listeners.delete(id);
  }

  /**
   * Starts dispatching ticker updates.
   */
  public start() {
    this.started = true;

    requestAnimationFrame((currentTime) => {
      this.tick({ delta: 0, current: currentTime });
    });
  }

  /**
   * Stops dispatching ticker updates.
   *
   * The internal animation frame loop keeps running, but listeners are skipped
   * until {@link start} sets the ticker back to active.
   */
  public stop() {
    this.started = false;
  }
}
