import * as React from "react";

const BLUR_CLASSES = {
    none: "backdrop-blur-none",
    xs: "backdrop-blur-xs",
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md",
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl",
    "2xl": "backdrop-blur-2xl",
    "3xl": "backdrop-blur-3xl",
} as const;

type BlurPreset = keyof typeof BLUR_CLASSES;
/** Either a preset key, or a complete Tailwind class such as "backdrop-blur-[3px]". */
type BlurLevel = BlurPreset | string;

interface BgGlassProps {
    /** Path or URL of the background image. */
    image?: string;
    /** Preset blur key, or a full Tailwind backdrop-blur class. */
    blur?: BlurLevel;
}

function resolveBlur(blur: BlurLevel): string {
    return blur in BLUR_CLASSES
        ? BLUR_CLASSES[blur as BlurPreset]
        : `backdrop-blur-${blur}`;
}

function BgGlass({
                     image = "/images/sidebar-bg-img.jpg",
                     blur = "xs",
                 }: BgGlassProps) {
    return (
        <>
            <div
                aria-hidden
                className="absolute inset-0 -z-20 bg-cover bg-center"
                style={{ backgroundImage: `url("${image}")` }}
            />
            <div
                aria-hidden
                className={`absolute inset-0 -z-10 bg-sidebar-glass backdrop-saturate-150 ${resolveBlur(blur)}`}
            />
        </>
    );
}

export { BgGlass };
export type { BgGlassProps, BlurLevel };