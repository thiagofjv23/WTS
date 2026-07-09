/**
 * Calendário oficial 2026 — Kyorugi / Senior (curado).
 *
 * Fontes:
 *  - Datas: "2026 World Taekwondo Event Calendar" (PDF oficial, baseado em
 *    imagem → lido por OCR). `dateExact:true` = data lida com confiança; caso
 *    contrário é aproximada dentro do mês/período (ver TODO.md).
 *  - G-Rank: inferido do ranking oficial (validado) para os eventos que
 *    pontuaram; para os grandes eventos de 2026 (Grand Prix Series/Final),
 *    lido do próprio calendário (G-6/G-10).
 *
 * ESCOPO: apenas Kyorugi/Senior. Poomsae, Virtual, Junior, Cadet, Team e Grand
 * Slam (formato especial) ficam de fora nesta fase (ver TODO.md).
 *
 * Todos os eventos disputam as 4 categorias masculinas no escopo atual.
 */

const MEN = ["WC-M-58", "WC-M-68", "WC-M-80", "WC-M-80+"];

/** Lista bruta (mês/dia 2026). Ordenada por data no final. */
const RAW = [
  // Fevereiro
  { date: "2026-02-03", gRank: "G-2", name: "13th Fujairah Open 2026", dateExact: true },
  { date: "2026-02-07", gRank: "G-1", name: "Austria Open 2026", dateExact: true },
  { date: "2026-02-08", gRank: "G-1", name: "Fujairah 6th Arab Cup 2026", dateExact: true },
  { date: "2026-02-17", gRank: "G-1", name: "4th Mt. Everest International Open", dateExact: true },
  { date: "2026-02-27", gRank: "G-2", name: "Bulgaria Open 2026", dateExact: true },
  // Março
  { date: "2026-03-07", gRank: "G-2", name: "2026 U.S. Open Championships", dateExact: true },
  { date: "2026-03-08", gRank: "G-2", name: "Slovenia Open 2026", dateExact: true },
  { date: "2026-03-14", gRank: "G-2", name: "Dutch Open 2026", dateExact: true },
  { date: "2026-03-22", gRank: "G-1", name: "Skopje Open Ramus 2026", dateExact: true },
  { date: "2026-03-28", gRank: "G-4", name: "2026 Oceania Taekwondo Championships", dateExact: true },
  { date: "2026-03-29", gRank: "G-4", name: "Pan American Taekwondo Championship 2026", dateExact: true },
  // Abril
  { date: "2026-04-17", gRank: "G-1", name: "Spanish Open 2026", dateExact: true },
  { date: "2026-04-25", gRank: "G-2", name: "2026 Canada Open", dateExact: false },
  // Maio
  { date: "2026-05-11", gRank: "G-4", name: "European Senior Championships 2026", dateExact: true },
  { date: "2026-05-21", gRank: "G-4", name: "27th Asian Taekwondo Championships 2026", dateExact: true },
  { date: "2026-05-30", gRank: "G-4", name: "2026 African Championships", dateExact: true },
  // Junho
  { date: "2026-06-05", gRank: "G-6", name: "Roma 2026 World Taekwondo Grand Prix Series", dateExact: true },
  { date: "2026-06-20", gRank: "G-1", name: "Turkiye Open 2026", dateExact: true },
  { date: "2026-06-27", gRank: "G-1", name: "Belgian Open 2026", dateExact: false },
  // Julho
  { date: "2026-07-11", gRank: "G-1", name: "Dominican Open 2026", dateExact: false },
  { date: "2026-07-25", gRank: "G-1", name: "British International Open Manchester 2026", dateExact: false },
  // Agosto
  { date: "2026-08-22", gRank: "G-1", name: "Lux Open 2026", dateExact: false },
  // Setembro
  { date: "2026-09-05", gRank: "G-6", name: "Muju 2026 World Taekwondo Grand Prix Series", dateExact: true },
  // Outubro
  { date: "2026-10-09", gRank: "G-6", name: "Paris 2026 World Taekwondo Grand Prix Series", dateExact: true },
  // Novembro
  { date: "2026-11-28", gRank: "G-10", name: "Astana 2026 World Taekwondo Grand Prix Final", dateExact: true },
];

export const CALENDAR_2026 = RAW.map((e) => ({ ...e, categoryIds: MEN })).sort(
  (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
);
