"use client";

import Image from "next/image";
import { useState } from "react";

type SmartImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  loading?: "lazy" | "eager";
  sizes?: string;
};

export function SmartImage({
  src,
  alt,
  className,
  fallbackSrc = "/images/sport-fallback.svg",
  loading = "lazy",
  sizes = "(max-width: 1024px) 100vw, 40vw",
}: SmartImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  return (
    <div className={className ? `relative ${className}` : "relative h-full w-full"}>
      <Image
        src={currentSrc}
        alt={alt}
        fill
        sizes={sizes}
        loading={loading}
        className="h-full w-full object-cover"
        onError={() => {
          if (currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
          }
        }}
      />
    </div>
  );
}
