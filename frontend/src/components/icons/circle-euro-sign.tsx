import * as React from "react";

/**
 * lucide "circle-euro-sign" (v1.24) — die im Projekt gepinnte lucide-react
 * 0.468 enthält dieses Icon noch nicht, daher lokal mit den offiziellen
 * Pfaddaten nachgebaut (gleiche Konventionen: 24er-Viewbox, stroke 2, round).
 */
export function CircleEuroSign(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M15 9.4a4 4 0 1 0 0 5.2" />
      <path d="M7 12h5" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
