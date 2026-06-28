import type { CSSProperties } from "react";

const CATEGORY_HUES: Record<string, number> = {
  "contact.origin": 220,
  "contact.relationship": 325,
  "contact.role": 145,
  "contact.work_area": 28,
  "contact.interests": 68,
  "contact.tags": 92,
  "businessPartner.types": 210,
  "businessPartner.business_relationship": 270,
  "businessPartner.tags": 180,
};

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) % 360;
  }
  return result;
}

export function tagColorStyle(value: string): CSSProperties {
  const hue = hash(value.trim().toLowerCase());
  return tagHueStyle(hue);
}

export function tagCategoryColorStyle(category: string): CSSProperties {
  const hue = CATEGORY_HUES[category] ?? hash(category.trim().toLowerCase());
  return tagHueStyle(hue);
}

function tagHueStyle(hue: number): CSSProperties {
  return {
    backgroundColor: `hsl(${hue} 80% 95%)`,
    borderColor: `hsl(${hue} 55% 82%)`,
    color: `hsl(${hue} 45% 28%)`,
  };
}
