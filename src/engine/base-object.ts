export abstract class BaseObject {
  /**
   * Updates the state of the object and renders it on the canvas.
   *
   * @param time - The current time information for this tick.
   * @param context - The canvas rendering context to draw on.
   */
  abstract tick(time: number, context: CanvasRenderingContext2D): void;
  abstract notifyClick(point: DOMPoint): void;
}
