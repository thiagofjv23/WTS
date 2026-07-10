/**
 * Bandeiras dos países. Converte o código IOC (usado no roster) em bandeira
 * emoji, via mapa IOC→ISO-2 e símbolos regionais Unicode. Códigos sem ISO-2
 * (ex.: Time de Refugiados) retornam null → a UI cai no código como texto.
 */

// IOC (roster) → ISO-2. Cobre os 176 países do roster.
const IOC_TO_ISO2 = {
  IRI: "IR", TUN: "TN", GRE: "GR", KOR: "KR", ESP: "ES", BLR: "BY", JOR: "JO",
  AZE: "AZ", TUR: "TR", UZB: "UZ", BRA: "BR", BUL: "BG", CAN: "CA", UKR: "UA",
  MDA: "MD", SRB: "RS", EGY: "EG", CHN: "CN", USA: "US", TPE: "TW", NIG: "NE",
  SLO: "SI", RUS: "RU", NED: "NL", KSA: "SA", ITA: "IT", JPN: "JP", HKG: "HK",
  THA: "TH", ISR: "IL", CRO: "HR", PLE: "PS", KAZ: "KZ", FRA: "FR", CHA: "TD",
  VEN: "VE", GER: "DE", AUS: "AU", IND: "IN", MAR: "MA", DOM: "DO", BUR: "BF",
  HUN: "HU", GUI: "GN", PUR: "PR", MLI: "ML", OMA: "OM", SEN: "SN", MEX: "MX",
  INA: "ID", POR: "PT", GEO: "GE", BIH: "BA", SWE: "SE", GBR: "GB", MAC: "MO",
  CHI: "CL", LBN: "LB", VIE: "VN", KOS: "XK", PER: "PE", PAK: "PK", POL: "PL",
  KGZ: "KG", ECU: "EC", PHI: "PH", COL: "CO", VAN: "VU", CIV: "CI", ROU: "RO",
  MGL: "MN", CYP: "CY", AFG: "AF", SIN: "SG", EST: "EE", NEP: "NP", DEN: "DK",
  CRC: "CR", BRN: "BH", HAI: "HT", ALB: "AL", MNE: "ME", NZL: "NZ", BRU: "BN",
  UAE: "AE", GUA: "GT", NGR: "NG", SMR: "SM", TOG: "TG", TTO: "TT", ARG: "AR",
  ARM: "AM", ALG: "DZ", SLE: "SL", KUW: "KW", ZIM: "ZW", DJI: "DJ", ZAM: "ZM",
  CGO: "CG", MOZ: "MZ", BOL: "BO", LBA: "LY", GAB: "GA", MAS: "MY", SUI: "CH",
  LUX: "LU", CMR: "CM", PNG: "PG", NCD: "NC", HON: "HN", MLT: "MT", PAN: "PA",
  LAO: "LA", UGA: "UG", ANG: "AO", PAR: "PY", TJK: "TJ", NOR: "NO", TLS: "TL",
  BEN: "BJ", KEN: "KE", BDI: "BI", STP: "ST", IRQ: "IQ", CAM: "KH", SGP: "SG",
  SWZ: "SZ", RWA: "RW", URU: "UY", QAT: "QA", CUB: "CU", ETH: "ET", NCA: "NI",
  ARU: "AW", MTN: "MR", BEL: "BE", BHU: "BT", CZE: "CZ", MAD: "MG", AUT: "AT",
  FIN: "FI", ISL: "IS", IRL: "IE", FPO: "PF", COK: "CK", TGA: "TO", SUR: "SR",
  SAM: "WS", COD: "CD", SVK: "SK", LBR: "LR", LTU: "LT", LAT: "LV", FIJ: "FJ",
  TKM: "TM", SOL: "SB", SUD: "SD", YEM: "YE", GEQ: "GQ", FGT: "GF", MYA: "MM",
  JAM: "JM", MKD: "MK", GHA: "GH", FRO: "FO", MRI: "MU", SSD: "SS", ISV: "VI",
  ESA: "SV", SRI: "LK", SYR: "SY", GBS: "GW", MRN: "MQ", GAM: "GM", BAR: "BB",
};

// Códigos sem bandeira emoji confiável → caem no texto do código.
const NO_FLAG = new Set(["XK"]); // Kosovo não tem bandeira emoji padrão

/** ISO-2 → bandeira emoji (símbolos regionais). */
function iso2ToFlag(iso2) {
  if (!iso2 || iso2.length !== 2 || NO_FLAG.has(iso2)) return null;
  const A = 0x1f1e6;
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

/** Bandeira emoji do país (por código IOC), ou null se indisponível. */
export function flagEmoji(ioc) {
  return iso2ToFlag(IOC_TO_ISO2[ioc]);
}

/** ISO-2 do código IOC (ou null). */
export function iso2Of(ioc) {
  return IOC_TO_ISO2[ioc] || null;
}
