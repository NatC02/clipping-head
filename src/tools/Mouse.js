import { gsap } from "gsap";

import Event from "./event";

function length(x, y) {
  return Math.sqrt(x * x + y * y);
}

class Mouse {
  constructor() {
    this.onMove = this.onMove.bind(this);

    this.position = {
      x: 0,
      y: 0,
    };

    this.positionFromCenter = {
      x: 0,
      y: 0,
    };

    this.positionPercent = {
      x: 0,
      y: 0,
    };

    this.prevPosition = {
      x: -1,
      y: -1,
    };

    this.moved = false;
    this.moving = false;
  }

  init() {
    this.bind();

    this.position.x = window.innerWidth * 0.5;
    this.position.y = window.innerHeight * 0.5;

    this.getFromCenter();
  }

  bind() {
    window.addEventListener("mousemove", this.onMove);
    window.addEventListener("touchmove", this.onMove);
  }

  onMove(e) {
    Event.toPoint(e, this.position);

    this.getFromCenter();

    if (!this.moved) {
      this.moved = true;
      document.documentElement.classList.add("moved");
    }
  }

  getFromCenter() {
    this.positionFromCenter.x = (this.position.x / window.innerWidth) * 2 - 1;
    this.positionFromCenter.y = -(this.position.y / window.innerHeight) * 2 + 1;

    this.positionFromCenter.x = gsap.utils.clamp(
      -1,
      1,
      this.positionFromCenter.x
    );
    this.positionFromCenter.y = gsap.utils.clamp(
      -1,
      1,
      this.positionFromCenter.y
    );

    this.positionPercent.x = this.position.x / window.innerWidth;
    this.positionPercent.y = this.position.y / window.innerHeight;

    this.positionPercent.x = gsap.utils.clamp(0, 1, this.positionPercent.x);
    this.positionPercent.y = 1 - gsap.utils.clamp(0, 1, this.positionPercent.y);
  }

  update(dt) {
    if (
      this.prevPosition.x == this.position.x &&
      this.prevPosition.y == this.position.y
    ) {
      this.moving = false;
    } else {
      this.moving = true;
    }

    this.prevPosition.x = this.position.x;
    this.prevPosition.y = this.position.y;
  }
}

export default new Mouse();