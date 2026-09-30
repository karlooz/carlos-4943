export function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <span className="brand">
      <img src="/snail.svg" width={size} height={size} alt="" aria-hidden="true" />
      <span className="brand__name">Caracolandia</span>
    </span>
  );
}
