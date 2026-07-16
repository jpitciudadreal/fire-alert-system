import Image, { type ImageProps } from "next/image";

interface PartnerLogoProps {
  /**
   * Visual footprint preset.
   *
   * - `header` — small, lives next to the app wordmark on the map page.
   * - `auth`   — larger, sits centred above the login/register card.
   */
  variant: "header" | "auth";
  /**
   * Optional override merged on top of the variant wrapper className.
   * Use to nudge size / position in a specific context without having to
   * introduce a new variant entry.
   */
  className?: string;
}

/**
 * Visual footprint and intrinsic `sizes` hint per variant.
 * Keeping them in one place avoids future drift between the two usages.
 */
const VARIANT_DIMS: Record<
  PartnerLogoProps["variant"],
  { wrapper: string; sizes: ImageProps["sizes"] }
> = {
  header: {
    wrapper: "h-9 w-36 sm:h-10 sm:w-40",
    sizes: "(max-width: 640px) 144px, 160px",
  },
  auth: {
    wrapper: "h-14 w-48 sm:h-16 sm:w-52",
    sizes: "(max-width: 640px) 192px, 208px",
  },
};

const ALT_TEXT = "Jefatura Provincial de Inspección de las Telecomunicaciones — Ministerio para la Transformación Digital y de la Función Pública";

/**
 * Renders `public/logo-jpit.jpg` inside a white backdrop so it
 * reads on the dark fire theme. Uses the `fill + object-contain` pattern so
 * the actual aspect ratio of the JPG is preserved regardless of whatever
 * dimensions the source file ships with.
 */
export function PartnerLogo({ variant, className }: PartnerLogoProps) {
  const dims = VARIANT_DIMS[variant];
  return (
    <div
      className={[
        "relative shrink-0 overflow-hidden",
        dims.wrapper,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Image
        src="/logo-jpit.jpg"
        alt={ALT_TEXT}
        fill
        sizes={dims.sizes}
        className="object-contain"
        priority
      />
    </div>
  );
}
