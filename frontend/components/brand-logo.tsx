import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
}

export function BrandLogo({
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 768px) 288px, 384px",
}: BrandLogoProps) {
  return (
    <Image
      src="/logo/logo.png"
      alt="Tickzen"
      width={1024}
      height={1024}
      priority={priority}
      sizes={sizes}
      className={cn(
        "block h-auto w-auto align-middle object-contain",
        "dark:brightness-110 dark:contrast-105 dark:saturate-110",
        className,
        imageClassName,
      )}
    />
  );
}
