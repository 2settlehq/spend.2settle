export interface PhoneCountry {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "NG", name: "Nigeria", dialCode: "234", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", dialCode: "233", flag: "🇬🇭" },
  { code: "KE", name: "Kenya", dialCode: "254", flag: "🇰🇪" },
  { code: "ZA", name: "South Africa", dialCode: "27", flag: "🇿🇦" },
  { code: "UG", name: "Uganda", dialCode: "256", flag: "🇺🇬" },
  { code: "TZ", name: "Tanzania", dialCode: "255", flag: "🇹🇿" },
  { code: "RW", name: "Rwanda", dialCode: "250", flag: "🇷🇼" },
  { code: "CM", name: "Cameroon", dialCode: "237", flag: "🇨🇲" },
  { code: "CI", name: "Côte d’Ivoire", dialCode: "225", flag: "🇨🇮" },
  { code: "SN", name: "Senegal", dialCode: "221", flag: "🇸🇳" },
  { code: "GM", name: "The Gambia", dialCode: "220", flag: "🇬🇲" },
  { code: "SL", name: "Sierra Leone", dialCode: "232", flag: "🇸🇱" },
  { code: "LR", name: "Liberia", dialCode: "231", flag: "🇱🇷" },
  { code: "BJ", name: "Benin", dialCode: "229", flag: "🇧🇯" },
  { code: "TG", name: "Togo", dialCode: "228", flag: "🇹🇬" },
  { code: "EG", name: "Egypt", dialCode: "20", flag: "🇪🇬" },
  { code: "MA", name: "Morocco", dialCode: "212", flag: "🇲🇦" },
  { code: "DZ", name: "Algeria", dialCode: "213", flag: "🇩🇿" },
  { code: "ET", name: "Ethiopia", dialCode: "251", flag: "🇪🇹" },
  { code: "ZM", name: "Zambia", dialCode: "260", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", dialCode: "263", flag: "🇿🇼" },
  { code: "AE", name: "United Arab Emirates", dialCode: "971", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", dialCode: "44", flag: "🇬🇧" },
  { code: "US", name: "United States", dialCode: "1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dialCode: "1", flag: "🇨🇦" },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

export const getPhoneCountry = (countryCode?: string) =>
  PHONE_COUNTRIES.find(
    (country) => country.code === String(countryCode ?? "").toUpperCase(),
  ) ?? DEFAULT_PHONE_COUNTRY;

export const isValidInternationalPhoneNumber = (phoneNumber: string) =>
  /^\+[1-9]\d{7,14}$/.test(phoneNumber);

export const normalizeInternationalPhoneNumber = (
  countryCode: string,
  phoneNumber: string,
) => {
  const country = PHONE_COUNTRIES.find(
    (item) => item.code === countryCode.toUpperCase(),
  );
  if (!country) return "";

  const rawPhoneNumber = phoneNumber.trim();
  let nationalNumber = rawPhoneNumber.replace(/\D/g, "");

  if (
    rawPhoneNumber.startsWith("+") &&
    nationalNumber.startsWith(country.dialCode)
  ) {
    nationalNumber = nationalNumber.slice(country.dialCode.length);
  }

  nationalNumber = nationalNumber.replace(/^0+/, "");
  const internationalNumber = `+${country.dialCode}${nationalNumber}`;

  return isValidInternationalPhoneNumber(internationalNumber)
    ? internationalNumber
    : "";
};

export const splitPhoneNumber = (
  phoneNumber: string,
  preferredCountryCode = "NG",
) => {
  const rawPhoneNumber = String(phoneNumber ?? "").trim();

  if (rawPhoneNumber.startsWith("+")) {
    const digits = rawPhoneNumber.replace(/\D/g, "");
    const matchingCountry = [...PHONE_COUNTRIES]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find((country) => digits.startsWith(country.dialCode));

    if (matchingCountry) {
      return {
        countryCode: matchingCountry.code,
        nationalNumber: digits.slice(matchingCountry.dialCode.length),
      };
    }
  }

  return {
    countryCode: getPhoneCountry(preferredCountryCode).code,
    nationalNumber: rawPhoneNumber.replace(/\D/g, ""),
  };
};
