"use client";

const TYPE_COLORS: Record<string, string> = {
  normal:   "#9A9A70",
  fighting: "#9D2721",
  flying:   "#7A6FD0",
  poison:   "#8A3D9F",
  ground:   "#A88520",
  rock:     "#8A7418",
  bug:      "#6E8510",
  ghost:    "#6A4E96",
  steel:    "#7878A0",
  fire:     "#E56B2C",
  water:    "#4A6FD0",
  grass:    "#4A9A38",
  electric: "#A87E00",
  psychic:  "#D03060",
  ice:      "#3A9898",
  dragon:   "#5020D8",
  dark:     "#5A3A2A",
  fairy:    "#C0607A",
};

interface TypeBadgeProps {
  type: string;
  label: string;
  className?: string;
}

export function TypeBadge({ type, label, className = "" }: TypeBadgeProps) {
  const bg = TYPE_COLORS[type.toLowerCase()] ?? "#666";
  return (
    <span
      style={{ backgroundColor: bg, whiteSpace: "nowrap" }}
      className={`inline-block px-2.5 py-1 rounded text-white text-xs font-bold
        tracking-wide drop-shadow-sm ${className}`}
    >
      {label}
    </span>
  );
}
