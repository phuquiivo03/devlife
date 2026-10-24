import { cn } from "@/lib/utils";
import { resolveIconAsset, resolveShippedIcon, type IconName } from "@/lib/pixel-assets";

type Props = {
  name: IconName | string;
  size?: number;
  className?: string;
  alt?: string;
  /**
   * Filenames from `public/ui/icons`. When set, the icon renders only if
   * `icon_<name>.png` or `icon_<name>_x4.png` is in the list.
   */
  files?: readonly string[];
};

export function PixelIcon({ name, size = 22, className, alt = "", files }: Props) {
  const asset = files
    ? resolveShippedIcon(name, size, files)
    : resolveIconAsset(name, size);
  if (!asset) return null;
  const { src, displayPx } = asset;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pixel icons stay unoptimized
    <img
      src={src}
      alt={alt}
      width={displayPx}
      height={displayPx}
      className={cn(
        // 3D icon set is 256px smooth art — render with default sampling,
        // nearest-neighbor (`pixelated`) crunches the downscaled icons.
        "size-auto max-w-none shrink-0",
        className,
      )}
      style={{
        width: displayPx,
        height: displayPx,
        minWidth: displayPx,
        minHeight: displayPx,
      }}
      draggable={false}
    />
  );
}
