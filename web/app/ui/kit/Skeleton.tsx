"use client";

import React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  w?: number | string;
  h?: number | string;
  r?: number | string; // optional radius
};

export function Skeleton({ w, h, r, style, className = "", ...rest }: SkeletonProps) {
  const s: React.CSSProperties = {
    width: typeof w === "number" ? `${w}px` : w,
    height: typeof h === "number" ? `${h}px` : h,
    borderRadius: typeof r === "number" ? `${r}px` : r,
    ...style,
  };

  return (
    <div
      className={`rm-skel ${className}`}
      style={s}
      {...rest}
    />
  );
}