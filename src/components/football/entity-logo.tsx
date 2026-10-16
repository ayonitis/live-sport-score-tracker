"use client";

import Image from "next/image";
import { Shield } from "lucide-react";
import { useMemo, useState } from "react";

type EntityLogoProps = {
  src: string;
  alt: string;
  size?: 22 | 24 | 28 | 32;
  className?: string;
};

export function EntityLogo({ src, alt, size = 22, className }: EntityLogoProps) {
  const [failed, setFailed] = useState(false);

  const dimensionClass = useMemo(() => {
    switch (size) {
      case 24:
        return "h-6 w-6";
      case 28:
        return "h-7 w-7";
      case 32:
        return "h-8 w-8";
      default:
        return "h-[22px] w-[22px]";
    }
  }, [size]);

  if (!src || failed) {
    return (
      <span
        className={`inline-flex ${dimensionClass} items-center justify-center rounded-md border border-stone-200 bg-stone-100 text-stone-500 ${className ?? ""}`}
        aria-hidden="true"
      >
        <Shield className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex ${dimensionClass} overflow-hidden rounded-md border border-stone-200 bg-white ${className ?? ""}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="32px"
        className="object-contain p-0.5"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
