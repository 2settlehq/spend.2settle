const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div
      aria-label="2Settle"
      className={`relative h-8 w-16 text-2xl md:w-24 lg:w-36 ${className}`}
      role="img"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[#315ba4]"
        style={{
          WebkitMaskImage: 'url("/logos/normal/logo-2.png")',
          WebkitMaskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskImage: 'url("/logos/normal/logo-2.png")',
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskSize: "contain",
        }}
      />
    </div>
  );
};

export default Logo;
