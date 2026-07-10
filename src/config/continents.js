/**
 * Mapa de continentes (uniões continentais da World Taekwondo) por código IOC,
 * e conjunto de países árabes. Usado pelas travas de elegibilidade
 * (eligibility.js): campeonatos continentais, President's Cup, Arab Cup.
 *
 * Cobre os 176 códigos IOC do roster real. Códigos sem continente (ex.: Time de
 * Refugiados) retornam null e não entram em eventos restritos por continente.
 *
 * Uniões: EUR (Europa), ASI (Ásia), PAM (Pan-América), AFR (África), OCE (Oceania).
 */

export const CONTINENTS = { EUR: "Europa", ASI: "Ásia", PAM: "Pan-América", AFR: "África", OCE: "Oceania" };

const BY_CONTINENT = {
  EUR: [
    "GRE", "ESP", "BLR", "TUR", "BUL", "UKR", "MDA", "SRB", "SLO", "RUS", "NED",
    "ITA", "CRO", "FRA", "GER", "HUN", "POR", "GEO", "BIH", "SWE", "GBR", "KOS",
    "POL", "ROU", "CYP", "EST", "DEN", "ALB", "MNE", "SMR", "ARM", "SUI", "LUX",
    "MLT", "NOR", "BEL", "CZE", "AUT", "FIN", "ISL", "IRL", "SVK", "LTU", "LAT",
    "MKD", "FRO", "ISR", "AZE",
  ],
  ASI: [
    "IRI", "KOR", "UZB", "CHN", "TPE", "JOR", "KSA", "JPN", "HKG", "THA", "KAZ",
    "IND", "OMA", "INA", "LBN", "VIE", "PAK", "KGZ", "PHI", "AFG", "SIN", "SGP",
    "NEP", "BRN", "BRU", "UAE", "KUW", "MGL", "MAC", "PLE", "QAT", "IRQ", "CAM",
    "LAO", "TJK", "TLS", "BHU", "MAS", "MYA", "SRI", "SYR", "YEM", "TKM",
  ],
  PAM: [
    "BRA", "CAN", "USA", "DOM", "VEN", "MEX", "CHI", "PER", "ECU", "COL", "ARG",
    "CRC", "HAI", "TTO", "GUA", "PUR", "BOL", "HON", "PAN", "PAR", "URU", "CUB",
    "NCA", "ARU", "SUR", "ISV", "ESA", "JAM", "MRN", "FGT", "BAR",
  ],
  AFR: [
    "TUN", "EGY", "NIG", "CHA", "MAR", "BUR", "GUI", "MLI", "SEN", "CIV", "TOG",
    "NGR", "ALG", "SLE", "ZIM", "DJI", "ZAM", "CGO", "MOZ", "LBA", "GAB", "CMR",
    "ANG", "BEN", "KEN", "BDI", "STP", "SWZ", "RWA", "ETH", "MTN", "MAD", "LBR",
    "SUD", "GEQ", "GHA", "MRI", "SSD", "GBS", "GAM", "UGA", "COD",
  ],
  OCE: ["AUS", "VAN", "NZL", "PNG", "NCD", "FPO", "COK", "TGA", "SAM", "FIJ", "SOL"],
};

/** Países da Liga Árabe presentes no roster (para eventos "Arab"). */
export const ARAB_IOC = new Set([
  "TUN", "JOR", "EGY", "KSA", "MAR", "OMA", "LBN", "PLE", "UAE", "BRN", "KUW",
  "ALG", "LBA", "IRQ", "QAT", "SUD", "YEM", "MTN", "DJI", "SYR",
]);

const CONTINENT_BY_IOC = {};
for (const [cont, list] of Object.entries(BY_CONTINENT)) {
  for (const ioc of list) CONTINENT_BY_IOC[ioc] = cont;
}
// Sem continente (não competem em eventos continentais restritos).
CONTINENT_BY_IOC.TRT = null; // Time de Refugiados

/** Continente (EUR/ASI/PAM/AFR/OCE) de um código IOC, ou null. */
export function continentOf(ioc) {
  return CONTINENT_BY_IOC[ioc] ?? null;
}

/** True se o país é da Liga Árabe. */
export function isArab(ioc) {
  return ARAB_IOC.has(ioc);
}
