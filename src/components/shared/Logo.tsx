import Image from "next/image";
import _ from "lodash";

const Logo = ({ className = "" }: { className?: string }) => {
  const isDec = isHoliday(new Date());

  return (
    <div className={`relative h-8 w-16 text-2xl md:w-24 lg:w-36 ${className}`}>
      <Image
        src={
          isDec
            ? "/logos/christmas/xmas-logo.png"
            : "/logos/normal/simple_logo.png"
        }
        alt="Logo"
        fill
        objectFit="contain"
        priority
      />
    </div>
  );
};

export default Logo;

const isHoliday = (date: Date): boolean => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (month === 12 && day <= 31) return true;
  if (month === 1 && day <= 15) return true;

  return false;
};
