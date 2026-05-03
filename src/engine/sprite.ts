import { isIntervalsOverlap, projectPolygonToInterval } from './sat-math';
import type { BaseObject } from './base-object';

interface SpriteSequenceBase {
  /** Number of frames in this sequence. */
  numberOfFrames: number;
  /** Playback speed in frames per second. */
  fps: number;
  /** Whether playback wraps to the first frame after the last frame. */
  loop: boolean;
}

interface SpriteSequenceHorizontal extends SpriteSequenceBase {
  /** Row index in the sprite sheet (0-based). */
  row: number;
}

interface SpriteSequenceVertical extends SpriteSequenceBase {
  /** Column index in the sprite sheet (0-based). */
  column: number;
}

type SpriteSequence = SpriteSequenceHorizontal | SpriteSequenceVertical;

interface SpriteOptions {
  /** Source URL/path of the sprite sheet image. */
  src: string;
  /** Width of one frame in the sprite sheet, in pixels. */
  spriteWidth: number;
  /** Height of one frame in the sprite sheet, in pixels. */
  spriteHeight: number;
  /** Named animation sequences available for this sprite. */
  sequences: Record<string, SpriteSequence>;
  /** Draw scale multiplier. Defaults to `1`. */
  scale?: number;
  /** Initial canvas center X coordinate. Defaults to `0`. */
  canvasX?: number;
  /** Initial canvas center Y coordinate. Defaults to `0`. */
  canvasY?: number;
  /** Initial rotation in radians. Defaults to `0`. */
  rotation?: number;
  /** Enables debug rendering helpers. Defaults to `false`. */
  debug?: boolean;
}

interface BoundingBox {
  /** Top-left corner. */
  topLeft: DOMPoint;
  /** Top-right corner. */
  topRight: DOMPoint;
  /** Bottom-left corner. */
  bottomLeft: DOMPoint;
  /** Bottom-right corner. */
  bottomRight: DOMPoint;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
}

/**
 * A drawable and collidable sprite backed by a sprite sheet image.
 *
 * `Sprite` extends `Image`, supports named animation sequences, rotation,
 * hit-testing, and SAT-based collision checks against other sprites.
 *
 * Emits a custom `'spriteClick'` event when {@link notifyClick} is called with
 * a point that falls inside the rotated sprite bounds. Event detail is a
 * `DOMPoint` in canvas coordinates.
 *
 * @example
 * const player = new Sprite({
 *   src: playerSpriteSheet,
 *   spriteWidth: 24,
 *   spriteHeight: 25,
 *   scale: 2,
 *   sequences: {
 *     moveLeft: { row: 4, fps: 10, numberOfFrames: 10, loop: true },
 *   },
 * });
 *
 * player.setSequence('moveLeft');
 * player.canvasX = 100;
 * player.canvasY = 100;
 */
export class Sprite extends Image implements BaseObject {
  private spriteWidth: number;
  private spriteHeight: number;

  private sequences: Map<string, SpriteSequence>;

  private currentSequence: SpriteSequence | null = null;
  private currentSequenceName: string | null = null;
  private currentFrame = 0;

  private lastTickTime = 0;

  private debug: boolean;

  public scale: number;

  public canvasX: number;
  public canvasY: number;

  // In radians
  public rotation: number;

  /**
   * Creates a sprite instance.
   */
  constructor({
    src,
    spriteWidth,
    spriteHeight,
    sequences,
    scale = 1,
    canvasX = 0,
    canvasY = 0,
    rotation = 0,
    debug = false,
  }: SpriteOptions) {
    super();

    const clonedSequences: Record<string, SpriteSequence> =
      structuredClone(sequences);

    for (const sequence of Object.values(clonedSequences)) {
      if ('row' in sequence) {
        continue;
      }

      if ('column' in sequence) {
        continue;
      }

      throw new Error('Sequence must specify direction or row/column');
    }

    this.src = src;
    this.spriteWidth = spriteWidth;
    this.spriteHeight = spriteHeight;
    this.sequences = new Map(Object.entries(clonedSequences));
    this.scale = scale;
    this.canvasX = canvasX;
    this.canvasY = canvasY;
    this.rotation = rotation;
    this.debug = debug;
  }

  private getTransformationMatrix() {
    // Rotate about center of the sprite
    return (
      new DOMMatrixReadOnly()
        .translate(this.canvasX, this.canvasY)
        // Angle is measured in degree
        .rotateAxisAngle(0, 0, 1, this.rotation * (180 / Math.PI))
        .translate(-this.canvasX, -this.canvasY)
    );
  }

  /**
   * Draws the current frame and advances animation timing.
   *
   * No rendering is performed until the image has loaded and a sequence has
   * been selected via {@link setSequence}.
   */
  public tick(time: number, context: CanvasRenderingContext2D) {
    if (!this.complete || !this.currentSequence) {
      return;
    }

    // Save the current context state so that any global state mutation can be stored later
    context.save();

    // These mutates the transformation matrix
    context.translate(this.canvasX, this.canvasY);
    context.rotate(this.rotation);
    // Undo the translation so the sprite will still be drawn at the correct position
    context.translate(-this.canvasX, -this.canvasY);

    const sourceX =
      'row' in this.currentSequence
        ? this.currentFrame * this.spriteWidth
        : this.currentSequence.column * this.spriteWidth;
    const sourceY =
      'row' in this.currentSequence
        ? this.currentSequence.row * this.spriteHeight
        : this.currentFrame * this.spriteHeight;

    context.drawImage(
      this,
      sourceX,
      sourceY,
      this.spriteWidth,
      this.spriteHeight,
      this.canvasX - (this.spriteWidth * this.scale) / 2,
      this.canvasY - (this.spriteHeight * this.scale) / 2,
      this.spriteWidth * this.scale,
      this.spriteHeight * this.scale,
    );

    if (this.debug) {
      context.fillStyle = 'blue';
      context.strokeStyle = 'blue';

      context.beginPath();
      context.ellipse(this.canvasX, this.canvasY, 5, 5, 0, 0, 2 * Math.PI);
      context.fill();

      const boundingBox = this.getBoundingBox();

      // The rotation matrix is still in place so no need to compute the rotated coordinates
      context.strokeRect(
        boundingBox.topLeft.x,
        boundingBox.topLeft.y,
        boundingBox.width,
        boundingBox.height,
      );

      context.beginPath();
      context.ellipse(
        boundingBox.topLeft.x,
        boundingBox.topLeft.y,
        5,
        5,
        0,
        0,
        2 * Math.PI,
      );
      context.fill();
    }

    context.restore();

    const delta = time - this.lastTickTime;

    if (delta < 1000 / this.currentSequence.fps) {
      return;
    }

    this.lastTickTime = time;

    if (this.currentSequence.loop) {
      this.currentFrame =
        (this.currentFrame + 1) % this.currentSequence.numberOfFrames;

      return;
    }

    this.currentFrame = Math.min(
      this.currentFrame + 1,
      this.currentSequence.numberOfFrames - 1,
    );
  }

  /**
   * Selects the active animation sequence by name and resets to frame `0`.
   *
   * @throws {Error} If the sequence name does not exist.
   */
  public setSequence(name: string) {
    if (name === this.currentSequenceName) {
      return;
    }

    const sequence = this.sequences.get(name);

    if (!sequence) {
      throw new Error(`Sequence not found: ${name}`);
    }

    this.currentSequence = sequence;
    this.currentSequenceName = name;
    this.currentFrame = 0;
  }

  /**
   * Returns the axis-aligned bounds of the sprite before rotation.
   */
  public getBoundingBox(): BoundingBox {
    return {
      topLeft: new DOMPoint(
        this.canvasX - (this.spriteWidth * this.scale) / 2,
        this.canvasY - (this.spriteHeight * this.scale) / 2,
      ),
      topRight: new DOMPoint(
        this.canvasX + (this.spriteWidth * this.scale) / 2,
        this.canvasY - (this.spriteHeight * this.scale) / 2,
      ),
      bottomLeft: new DOMPoint(
        this.canvasX - (this.spriteWidth * this.scale) / 2,
        this.canvasY + (this.spriteHeight * this.scale) / 2,
      ),
      bottomRight: new DOMPoint(
        this.canvasX + (this.spriteWidth * this.scale) / 2,
        this.canvasY + (this.spriteHeight * this.scale) / 2,
      ),
      width: this.spriteWidth * this.scale,
      height: this.spriteHeight * this.scale,
    };
  }

  /**
   * Returns sprite bounds with corner points transformed by current rotation.
   */
  public getRotatedBoundingBox(): BoundingBox {
    const boundingBox = this.getBoundingBox();

    const transformationMatrix = this.getTransformationMatrix();

    return {
      topLeft: boundingBox.topLeft.matrixTransform(transformationMatrix),
      topRight: boundingBox.topRight.matrixTransform(transformationMatrix),
      bottomLeft: boundingBox.bottomLeft.matrixTransform(transformationMatrix),
      bottomRight:
        boundingBox.bottomRight.matrixTransform(transformationMatrix),
      width: boundingBox.width,
      height: boundingBox.height,
    };
  }

  /**
   * Tests collision with another sprite using SAT on rotated rectangles.
   */
  public collidesWith(other: Sprite) {
    const thisSpriteBoundingBox = this.getRotatedBoundingBox();
    const otherSpriteBoundingBox = other.getRotatedBoundingBox();

    const thisPolygon = [
      thisSpriteBoundingBox.topLeft,
      thisSpriteBoundingBox.topRight,
      thisSpriteBoundingBox.bottomLeft,
      thisSpriteBoundingBox.bottomRight,
    ];
    const otherPolygon = [
      otherSpriteBoundingBox.topLeft,
      otherSpriteBoundingBox.topRight,
      otherSpriteBoundingBox.bottomLeft,
      otherSpriteBoundingBox.bottomRight,
    ];

    const axes = [
      {
        start: thisSpriteBoundingBox.topLeft,
        end: thisSpriteBoundingBox.topRight,
      },
      {
        start: thisSpriteBoundingBox.topLeft,
        end: thisSpriteBoundingBox.bottomLeft,
      },
      {
        start: otherSpriteBoundingBox.topLeft,
        end: otherSpriteBoundingBox.topRight,
      },
      {
        start: otherSpriteBoundingBox.topLeft,
        end: otherSpriteBoundingBox.bottomLeft,
      },
    ];

    for (const axis of axes) {
      const thisProjection = projectPolygonToInterval(
        thisPolygon,
        axis.start,
        axis.end,
      );
      const otherProjection = projectPolygonToInterval(
        otherPolygon,
        axis.start,
        axis.end,
      );

      if (!isIntervalsOverlap(thisProjection, otherProjection)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks whether a canvas-space point is inside this sprite's rotated bounds.
   */
  public pointInBoundingBox(point: DOMPoint) {
    const boundingBox = this.getBoundingBox();
    const rotatedPoint = point.matrixTransform(
      this.getTransformationMatrix().inverse(),
    );

    return (
      rotatedPoint.x >= boundingBox.topLeft.x &&
      rotatedPoint.x <= boundingBox.topRight.x &&
      rotatedPoint.y >= boundingBox.topLeft.y &&
      rotatedPoint.y <= boundingBox.bottomLeft.y
    );
  }

  /**
   * Emits `'spriteClick'` when the supplied point intersects this sprite.
   */
  public notifyClick(point: DOMPoint) {
    if (!this.pointInBoundingBox(point)) {
      return;
    }

    const clickEvent = new CustomEvent('spriteClick', { detail: point });
    this.dispatchEvent(clickEvent);
  }

  /**
   * Enables or disables debug bounding box and center point rendering.
   */
  public setDebug(debug: boolean) {
    this.debug = debug;
  }
}
