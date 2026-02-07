import * as React from "react";

interface LogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function KardonLockup({
  width = 40,
  height = 40,
  className,
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <img
        src="/app/assets/images/logo-spinner-dark"
        alt="Kardon Logo"
        width={width}
        height={height}
      />
      <span className="font-semibold text-lg tracking-wide">
        KARDON
      </span>
    </div>
  );
}
