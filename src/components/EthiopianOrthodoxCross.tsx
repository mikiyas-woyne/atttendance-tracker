import React from 'react';

interface EthiopianOrthodoxCrossProps {
  className?: string;
}

export const EthiopianOrthodoxCross: React.FC<EthiopianOrthodoxCrossProps> = ({
  className = 'w-7 h-7 text-amber-300',
}) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Authentic Ethiopian Processional Meskel Cross Design */}
      {/* Central Cross Shafts */}
      <rect x="44" y="10" width="12" height="80" rx="1.5" />
      <rect x="10" y="44" width="80" height="12" rx="1.5" />

      {/* Arm End Trefoils / Crosslets - Top */}
      <path d="M 50 4 L 40 14 L 60 14 Z" />
      <circle cx="50" cy="5" r="3.5" />
      <circle cx="41" cy="12" r="2.5" />
      <circle cx="59" cy="12" r="2.5" />

      {/* Arm End Trefoils - Bottom */}
      <path d="M 50 96 L 40 86 L 60 86 Z" />
      <circle cx="50" cy="95" r="3.5" />
      <circle cx="41" cy="88" r="2.5" />
      <circle cx="59" cy="88" r="2.5" />

      {/* Arm End Trefoils - Left */}
      <path d="M 4 50 L 14 40 L 14 60 Z" />
      <circle cx="5" cy="50" r="3.5" />
      <circle cx="12" cy="41" r="2.5" />
      <circle cx="12" cy="59" r="2.5" />

      {/* Arm End Trefoils - Right */}
      <path d="M 96 50 L 86 40 L 86 60 Z" />
      <circle cx="95" cy="50" r="3.5" />
      <circle cx="88" cy="41" r="2.5" />
      <circle cx="88" cy="59" r="2.5" />

      {/* Geometric Ethiopian Square Quadrant Rays */}
      <path
        d="M 32 32 L 42 42 M 68 32 L 58 42 M 32 68 L 42 58 M 68 68 L 58 58"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Corner Filigree Diamonds */}
      <polygon points="30,30 35,25 40,30 35,35" />
      <polygon points="70,30 75,25 80,30 75,35" />
      <polygon points="30,70 35,65 40,70 35,75" />
      <polygon points="70,70 75,65 80,70 75,75" />

      {/* Center Circle Rosette */}
      <circle cx="50" cy="50" r="8" fill="currentColor" />
      <circle cx="50" cy="50" r="4" className="fill-red-950" />
    </svg>
  );
};
