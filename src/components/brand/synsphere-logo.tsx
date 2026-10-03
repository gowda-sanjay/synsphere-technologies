import Image from "next/image";

export function SynSphereLogo({
  className = "h-12 w-auto object-contain",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/images/synsphere-logo.png"
      alt="SynSphere Technologies Pvt Ltd"
      width={768}
      height={512}
      priority={priority}
      sizes="160px"
      className={className}
    />
  );
}
