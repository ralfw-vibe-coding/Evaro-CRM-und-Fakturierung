import type { CSSProperties } from "react";

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) % 360;
  }
  return result;
}

export function tagColorStyle(value: string): CSSProperties {
  const hue = hash(value.trim().toLowerCase());
  return {
    backgroundColor: `hsl(${hue} 80% 95%)`,
    borderColor: `hsl(${hue} 55% 82%)`,
    color: `hsl(${hue} 45% 28%)`,
  };
}
