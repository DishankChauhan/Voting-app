import React from "react";
import { LucideProps } from "lucide-react";

export const Vote = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ color = "currentColor", size = 24, strokeWidth = 2, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <rect x="3" y="10" width="18" height="10" rx="2" />
        <path d="M7 10V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4" />
        <path d="M12 14l2 2 4-4" />
      </svg>
    );
  }
);

Vote.displayName = "VoteIcon"; 