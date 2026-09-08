// Small shared identity tiles for the mobile product mockups.

export function OrqaraMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      className={className ? `rounded-[22%] ${className}` : "rounded-[22%]"}
    />
  );
}

/** A hashed identity tile — one letter on a muted identity fill. */
export function LetterTile({
  letter,
  tone,
}: {
  letter: string;
  tone: "red" | "violet" | "amber" | "teal";
}) {
  return (
    <span
      className={`flex size-[18px] shrink-0 items-center justify-center rounded-[5px] text-[10px] font-semibold text-white ${TILE_TONE[tone]}`}
    >
      {letter}
    </span>
  );
}

const TILE_TONE = {
  red: "bg-mock-tile-red",
  violet: "bg-mock-tile-violet",
  amber: "bg-mock-tile-amber",
  teal: "bg-mock-tile-teal",
} as const;

/** The Orqara project tile. */
export function OrqaraTile() {
  return (
    <span className="flex size-[18px] shrink-0 items-center justify-center overflow-hidden rounded-[5px]">
      <OrqaraMark size={18} />
    </span>
  );
}
