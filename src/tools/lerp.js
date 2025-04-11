export function lerp(start, end, amt) {
  let value = (1 - amt) * start + amt * end;

  return value;
}