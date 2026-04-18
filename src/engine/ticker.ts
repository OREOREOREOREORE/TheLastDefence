export interface Time {
  delta: number;
  current: number;
}
export type TickerListener = (time: Time) => void;

export class Ticker {
  private lastTickTime = 0;
  private fps: number;
  private listeners = new Map<number, TickerListener>();

  private listenerIdBase = 0;

  private started = false;

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

  public addListener(listener: TickerListener) {
    const id = this.listenerIdBase;
    this.listeners.set(id, listener);
    this.listenerIdBase++;

    return id;
  }

  public removeListener(id: number) {
    this.listeners.delete(id);
  }

  public start() {
    this.started = true;

    requestAnimationFrame((currentTime) => {
      this.tick({ delta: 0, current: currentTime });
    });
  }

  public stop() {
    this.started = false;
  }
}
