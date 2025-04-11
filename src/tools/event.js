import Point from "./point";

export default class EventTools {
  static toPoint(e, point = new Point()) {
    var source = e.changedTouches
      ? e.changedTouches[0]
      : e.touches
      ? e.touches[0]
      : e;
    point.x = source.clientX;
    point.y = source.clientY;
    return point;
  }
}