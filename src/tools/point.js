export default class Point {
  constructor(x, y, z) {
    this.x = parseFloat(x) || 0;
    this.y = parseFloat(y) || 0;
    this.z = parseFloat(z) || 0;
  }

  clone() {
    return new Point(this.x, this.y, this.z);
  }

  get norm() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
  }

  distance(point) {
    return Math.sqrt(this.distanceSquared(point));
  }

  distanceSquared(point) {
    return (
      Math.pow(this.x - point.x, 2) +
      Math.pow(this.y - point.y, 2) +
      Math.pow(this.z - point.z, 2)
    );
  }

  vectorWithPoint(point) {
    return new Point(point.x - this.x, point.y - this.y);
  }

  angleWithPoints(p1, p2) {
    var a = p1.distance(p2),
      b = this.distance(p1),
      c = this.distance(p2);

    return Math.acos(
      (Math.pow(a, 2) - Math.pow(b, 2) - Math.pow(c, 2)) / (-2 * b * c)
    );
  }

  pointWithVectorAndDistance(vector, distance) {
    var angle = Math.atan2(vector.y, vector.x);
    return new Point(
      distance * Math.cos(angle) + this.x,
      distance * Math.sin(angle) + this.y
    );
  }

  distanceWithSegment(p1, p2) {
    return this.distance(this.pointWithSegement(p1, p2));
  }

  pointWithSegement(p1, p2) {
    var l2 = p1.distanceSquared(p2);
    if (l2 == 0) return p1;
    var t =
      ((this.x - p1.x) * (p2.x - p1.x) + (this.y - p1.y) * (p2.y - p1.y)) / l2;
    if (t < 0) return p1;
    if (t > 1) return p2;
    return new Point(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
  }

  pointWithRotation(angle) {
    return new Point(
      this.x * Math.cos(angle) + this.y * Math.sin(angle),
      -this.x * Math.sin(angle) + this.y * Math.cos(angle)
    );
  }

  isInTriangle(p1, p2, p3) {
    var b1 = this._sign(this, p1, p2) < 0,
      b2 = this._sign(this, p2, p3) < 0,
      b3 = this._sign(this, p3, p1) < 0;
    return b1 == b2 && b2 == b3;
  }

  _sign(p1, p2, p3) {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

  static intersectionWith2Segments(p1, p2, p3, p4) {
    var d = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

    if (d == 0) {
      return null;
    }

    var n_a = (p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x),
      n_b = (p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x),
      ua = n_a / d,
      ub = n_b / d;

    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return new Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    }
    return null;
  }
}