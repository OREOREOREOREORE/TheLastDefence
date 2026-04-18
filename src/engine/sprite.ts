import { isIntervalsOverlap, projectPolygonToInterval } from './sat-math';

interface SpriteSequence {
  row: number;
  numberOfFrames: number;
  fps: number;
  loop: boolean;
}

interface SpriteOptions {
  src: string;
  spriteWidth: number;
  spriteHeight: number;
  sequences: Record<string, SpriteSequence>;
  scale?: number;
  canvasX?: number;
  canvasY?: number;
  rotation?: number;
  debug?: boolean;
}

interface BoundingBox {
  topLeft: DOMPoint;
  topRight: DOMPoint;
  bottomLeft: DOMPoint;
  bottomRight: DOMPoint;
  width: number;
  height: number;
}

export class Sprite extends Image {
  private spriteWidth: number;
  private spriteHeight: number;

  private sequences: Map<string, SpriteSequence>;

  private currentSequence: SpriteSequence | null = null;
  private currentFrame = 0;

  private lastTickTime = 0;

  private debug: boolean;

  public scale: number;

  public canvasX: number;
  public canvasY: number;

  // In radians
  public rotation: number;

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

    this.src = src;
    this.spriteWidth = spriteWidth;
    this.spriteHeight = spriteHeight;
    this.sequences = new Map(Object.entries(sequences));
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

    context.drawImage(
      this,
      this.currentFrame * this.spriteWidth,
      this.currentSequence.row * this.spriteHeight,
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

  public setSequence(name: string) {
    const sequence = this.sequences.get(name);
    if (!sequence) {
      throw new Error(`Sequence not found: ${name}`);
    }

    this.currentSequence = sequence;
    this.currentFrame = 0;
  }

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

  public notifyClick(point: DOMPoint) {
    if (!this.pointInBoundingBox(point)) {
      return;
    }

    const clickEvent = new CustomEvent('spriteClick', { detail: point });
    this.dispatchEvent(clickEvent);
  }

  public setDebug(debug: boolean) {
    this.debug = debug;
  }
}
