# PROGRESS — Diário de Desenvolvimento

Registro do que foi construído em cada passo, o que foi testado e o resultado.
Cada passo só é encerrado após seus testes passarem.

---

## Passo 1 — Serviços de Base ✅

**Objetivo:** construir a infraestrutura sobre a qual todo o motor se apoia,
seguindo os documentos de arquitetura (Random System, World Event Bus, Storage).

**Entregue:**
- `src/services/random.js` — `RandomSystem` (Mulberry32 com seed). Métodos:
  `next`, `int`, `float`, `chance`, `pick`, `weighted`, `gaussian`, `shuffle`,
  `derive`, `getState`/`setState`. Única fonte de aleatoriedade do projeto.
- `src/services/eventBus.js` — `EventBus` síncrono e determinístico com
  `on`/`once`/`off`/`publish`, prioridades e log opcional para auditoria.
- `src/services/storage.js` — `StorageService` + backends `MemoryBackend`
  (testes/console) e `LocalStorageBackend` (navegador).
- `src/services/logger.js` — logger leve e desligável.
- `tests/` — harness próprio sem dependências + 18 testes.

**Testado:** `npm test` → **18/18 passaram.**
- Determinismo do RNG (mesma seed → mesma sequência; salvar/retomar estado).
- Estatística do RNG: `chance`, `weighted` e `gaussian` convergem aos valores
  esperados em 20 mil amostras.
- Event Bus: entrega, prioridade, cancelamento, `once`.
- Storage: serialização JSON, fallback, namespaces isolados.

**Decisões registradas em DECISIONS.md:** PRNG Mulberry32, Event Bus síncrono,
Storage com backend plugável.

**Próximo passo:** Passo 2 — geração de nomes (pré-processar os arquivos de
nomes da main em um `names.js` compacto).

---

## Passo 2 — Geração de Nomes ✅

**Objetivo:** gerar nomes de atletas por país consumindo o mínimo de
processamento em runtime (pedido do usuário).

**Entregue:**
- `scripts/buildNames.mjs` — build que lê os dois arquivos de nomes da raiz
  (~890 KB) e gera um dicionário compacto. Parametrizável por país e gênero.
- `src/database/names.js` — **GERADO** (3.1 KB). Masculino, romanizado, países
  KR/TR/BR/CN.
- `src/services/nameGenerator.js` — `generateName(random, country)` faz apenas
  dois sorteios O(1); `availableCountries`, `hasCountry`.
- `tests/names.test.mjs` — 6 testes.

**Testado:** `npm test` → **24/24 passaram.**
- Dicionário cobre os 4 países do seed; geração determinística por seed;
  variedade de nomes; erro claro para país sem dados.

**Resultado de eficiência:** 890 KB de origem → **3.1 KB** consumidos em runtime;
custo de parse ocorre só na build.

**Próximo passo:** Passo 3 — entidades, atributos e categorias de peso
(masculinas), com factories.

---

## Passo 3 — Entidades, Atributos e Categorias ✅

**Objetivo:** modelar a camada de dados (fonte única da verdade) seguindo
DataArchitecture.md e athlete_attributes.md, só com dados (sem lógica).

**Entregue:**
- `src/config/attributes.js` — 4 grupos de atributos (técnico/físico/mental/
  desenvolvimento) + ocultos, escala 0–100, `clampAttribute`, `validateAttributes`.
- `src/config/weightCategories.js` — 4 categorias masculinas olímpicas
  (-58, -68, -80, +80 kg). Feminino fica por extensão no mesmo arquivo.
- `src/utils/ids.js` — `IdGenerator` com IDs permanentes por prefixo e estado
  serializável (não reusa IDs entre sessões — SimulationRules §9).
- `src/entities/athlete.js` — `createAthlete` (componentes ECS: identidade,
  attributes, ranking, statistics, history), 100% serializável.
- `src/entities/country.js` — `createCountry` (estatísticas derivadas dos atletas).
- `tests/entities.test.mjs` — 11 testes.

**Testado:** `npm test` → **35/35 passaram.**
- IDs sequenciais e restauráveis; validação/clamp de atributos; 4 categorias
  masculinas; atleta serializável round-trip; cópia isolada de atributos;
  erros claros para campos obrigatórios ausentes.

**Próximo passo:** Passo 4 — geração de atletas por tier + seed pequeno do
mundo (4 países), montando um `WorldState` inicial consistente.

---

## Passo 4 — Geração de Atletas e Seed do Mundo ✅

**Objetivo:** montar um mundo inicial pequeno, consistente e determinístico.

**Entregue:**
- `src/engine/generation.js` — geração de atributos por tier via gaussiana
  (elite >90 rara), experiência ligada à idade, nome via nameGenerator.
- `src/core/world.js` — contêiner `World` (WorldState + repositórios por ID),
  `addAthlete`/`addCountry`, `athletesInCategory`, guarda estados de RNG/IDs.
- `src/database/seedConfig.js` — 4 países (KR/TR/CN/BR), pesos históricos.
- `src/database/seed.js` — `buildSeedWorld(seed)` → mundo serializável.
- `tests/seed.test.mjs` — 9 testes.

**Testado:** `npm test` → **44/44 passaram.**
- Contagens corretas; determinismo (mesma seed → mundo idêntico byte a byte);
  integridade referencial bidirecional país↔atleta; atributos válidos;
  KR > BR em nº de atletas (peso histórico); serialização JSON round-trip.

**Sanidade manual:** 72 atletas, nomes coerentes por país, atributos tier-1 na
faixa ~60–85, idades 18–32.

**Próximo passo:** Passo 5 — Combat Framework (uma luta completa entre dois
atletas, emergente e determinística), isolada e testável.

---

## Passo 5 — Combat Framework ✅

**Objetivo:** simular uma luta completa como sucessão de decisões (emergente),
não como comparação de atributos, seguindo combat_framework.md e fight_algorithm.md.

**Entregue (engines modulares compartilhando o Fight State):**
- `src/engine/combat/fightState.js` — estado único da luta.
- `src/engine/combat/rules.js` — catálogo de ações, valores de pontuação (WT),
  gam-jeom, melhor de 3 rounds, critérios de vitória.
- `src/engine/combat/probability.js` — Probability Engine (logística sobre
  diferenças de atributos; energia, forma, momentum).
- `src/engine/combat/decision.js` — Decision Engine (planos táticos, escolha de
  ação, adaptação de comportamento por Adaptabilidade).
- `src/engine/combat/fightManager.js` — orquestrador na ordem oficial: distância
  → iniciativa → gam-jeom → ação → defesa → contra-ataque → acerto → placar →
  momentum/energia; rounds, desempate (golden exchange), encerramento.
- `tests/combat.test.mjs` — 8 testes.

**Testado:** `npm test` → **51/51 passaram.**
- Vencedor/perdedor distintos; vencedor com 2 rounds; determinismo por seed;
  estatísticas coerentes; **equilíbrio estatístico** (favorito claro vence
  >75% mas <100%; iguais ~50/50).

**Curva de calibração observada (1000 lutas/par):** gap 0 ≈ 49%, gap 4 ≈ 73%,
gap 10 ≈ 92%, gap 24 ≈ 99.8%. Ajustável (ver DECISIONS.md/TODO.md).

**A engine NÃO toca ranking/medalhas/histórico** — só produz o resultado técnico,
como exige o fight_algorithm.md.

**Próximo passo:** Passo 6 — Competition System (chaves/brackets por categoria,
eliminação simples com byes por ranking) consumindo o Combat Framework.

---

## Passo 6 — Competition System (Brackets) ✅

**Objetivo:** montar chaves por categoria e apurar resultados rodando o Combat
Framework, seguindo taekwondo-ranking.md §6.

**Entregue:**
- `src/engine/brackets.js` — `nextPowerOfTwo`, `standardSeedOrder` (top seeds em
  lados opostos), `buildBracket` (byes para os melhores ranqueados).
- `src/entities/competition.js` — `createCompetition` + catálogo `G_RANKS`
  (G-1..G-20 com pontos do campeão).
- `src/engine/competitionSystem.js` — `simulateCategory` / `simulateCompetition`:
  eliminação simples, colocação por rodada (campeão=1, vice=2, 2 bronzes,
  QF=5, R16=9…), medalhas. Delega o resultado ao Combat Engine.
- `tests/competition.test.mjs` — 11 testes.

**Testado:** `npm test` → **62/62 passaram.**
- Potência de dois e seeding; byes aos melhores; um campeão/um vice; dois
  bronzes (padrão WT); campo não-potência (18) apura todos; atleta único;
  favorito vence >70% dos torneios; determinismo; competição multi-categoria.

**Adiado (TODO.md):** repescagem olímpica (dois bronzes por chaves separadas) e
bloqueio de equipe/clube (sem entidade Club).

**Próximo passo:** Passo 7 — Ranking System (aplicar pontos G-Rank por colocação
+ desempate) e o Simulation Director costurando o pipeline diário via Event Bus,
para rodar um campeonato completo no console ponta a ponta.

---

## Passo 7 — Ranking System + Simulation Director (pipeline completo) ✅

**Objetivo:** costurar o pipeline diário e rodar um campeonato inteiro no console.

**Entregue:**
- `src/engine/ranking.js` — `pointsForPlacement` (tabela oficial §2, não
  geométrica), `recomputeRankings` (posições derivadas dos pontos).
- `src/engine/consequence.js` — estatísticas de atletas e países (soma).
- `src/engine/history.js` — histórico permanente (append-only).
- `src/engine/calendar.js` + `src/utils/dates.js` — agendamento e datas ISO.
- `src/engine/simulationDirector.js` — orquestra o pipeline e publica eventos:
  `NewDayStarted → Calendar → Competition(→Combat) → Consequence → Ranking →
  History → Save → DayFinished`.
- `scripts/demo.mjs` — demo de console (pódios, ranking, quadro de medalhas).
- `tests/pipeline.test.mjs` — 9 testes.

**Testado:** `npm test` → **71/71 passaram.** Inclui: tabela de pontos G-1
(10/6/3.6/2.16/1.51); campeões apurados; ranking/estatísticas/país/histórico
atualizados; vitórias=derrotas; eventos publicados; save persistido;
**determinismo do pipeline** (mesma seed → mundo final idêntico).

**Demo executada** (`node scripts/demo.mjs`): 72 atletas, 68 lutas, 4 pódios,
ranking mundial por categoria, quadro de medalhas por país, 4 registros de
histórico, save persistido, data avançada. **Núcleo provado ponta a ponta.**

---

## Passo 8 — Atletas REAIS (seed híbrido a partir do ranking oficial) ✅

**Objetivo:** substituir o seed sintético por atletas reais do ranking oficial
World Taekwondo, mantendo idade/atributos gerados (híbrido).

**Entregue:**
- `scripts/buildRoster.mjs` — parser próprio de .xlsx (sem dependências) que lê
  o ranking oficial e gera o roster compacto. Colunas mapeadas por cabeçalho.
- `src/database/realRoster.js` — **GERADO** (95 KB): TOP 256 por categoria
  masculina (1.024 atletas, 176 países), nome/IOC/pontos reais.
- `src/engine/generation.js` — `generateRealAthlete` (identidade real + idade e
  atributos gerados), `baseFromStrength`, `generateAge`.
- `src/database/realSeed.js` — `buildRealWorld(seed)`: países + atletas reais,
  pontos reais, atributos ancorados na posição do ranking.
- Entry list: `fieldSize` na competição + `selectEntrants` (chaves realistas).
- `scripts/demoReal.mjs` — demo com atletas reais.
- `tests/realSeed.test.mjs` — 12 testes.

**Testado:** `npm test` → **83/83 passaram.** Inclui: identidade/pontos reais
preservados; nº 1 do ranking = líder real; topo mais forte que a base;
determinismo; entry list por ranking; idade/força na faixa.

**Demo real** (`node scripts/demoReal.mjs`): líderes corretos (Zandi/IRI,
Tubtimdang/THA, Fernandes/BRA, Alessio/ITA); Grand Prix G-2 com 124 lutas;
Coreia liderando em profundidade de ranking — coerente com a realidade.

---

## Passo 9 — Calendário e Temporada REAIS ✅

**Objetivo:** usar os eventos reais do ranking como base do calendário anual e
simular uma temporada inteira.

**Entregue:**
- `scripts/buildRoster.mjs` — passou a extrair também os **eventos** das colunas
  do ranking, inferindo o G-Rank pela pontuação máxima (regra: menor tier ≥ max,
  robusta à redução por participação da WT).
- `src/database/realRoster.js` — agora inclui `REAL_EVENTS`: **23 eventos reais**
  (G-2:7, G-4:6, G-1:10) com G-Rank e categorias.
- `src/engine/season.js` — `buildSeasonCalendar` cria/agenda as competições da
  temporada (datas distribuídas; datas reais → TODO).
- `SimulationDirector.advanceUntil(date)` — simula até o fim da temporada.
- `scripts/demoSeason.mjs` — demo de temporada completa.
- `tests/season.test.mjs` — 6 testes.

**Testado:** `npm test` → **88/88 passaram.** Inclui: G-Rank inferido correto
(Europeu=G-4, Turkiye=G-1); calendário em datas crescentes; temporada evolui o
ranking; determinismo do ano inteiro.

**Demo de temporada** (`node scripts/demoSeason.mjs`): 23 eventos, **2.790 lutas
em 0,3 s**, ranking evoluindo com indicadores ▲▼, títulos e ganho de pontos.
Fernandes (real nº 1 do -80) dominou com 10 títulos. Atletas e eventos 100% reais.

---

## Passo 10 — Calendário oficial 2026, decaimento e múltiplas temporadas ✅

**Objetivo:** simular várias temporadas consecutivas usando o calendário oficial
WT 2026 (Kyorugi/Senior) com decaimento de pontos de 4 anos.

**Entregue:**
- G-Rank generalizado: `championPointsFor("G-n") = n×10` (competition.js), aceita
  G-6/G-10 do calendário real. `ranking.js` usa a fórmula geral.
- **Decaimento §5** via ledger: `athlete.pointsLedger` + `decayFactor` +
  `effectivePoints`; `recomputeRankings` recalcula pontos efetivos com
  decaimento a cada atualização.
- `src/database/calendar2026.js` — calendário oficial 2026 curado (25 eventos
  Kyorugi/Senior; datas do PDF, graus do ranking; GP Series G-6, GP Final G-10).
- `src/engine/season.js` — usa datas reais + `yearOffset` para temporadas
  seguintes; `SimulationDirector.advanceUntil`.
- `scripts/demoMultiSeason.mjs` — demo de N temporadas.
- `tests/season.test.mjs` — reescrito: 10 testes (grades, calendário, decaimento,
  multi-temporada, determinismo).

**Testado:** `npm test` → **92/92 passaram.**

**Extração do PDF:** o calendário é um PDF de IMAGEM; extraí via OCR (tesseract)
com upscaling. Datas/graus por linha saem confiáveis; títulos (células mescladas)
não alinham → calendário curado. Detalhes em DECISIONS.md.

**Demo multi-temporada** (`node scripts/demoMultiSeason.mjs`): 4 temporadas,
**12.400 lutas em ~2 s**. O **decaimento fica visível**: os pontos sobem e depois
estabilizam/caem à medida que resultados antigos expiram; novos nomes entram no
top 5. Determinístico por seed.

**Gaps de realismo anotados no TODO:** participação por atleta (hoje todos os
top-32 entram em todos os eventos) e regra "melhores N resultados contam" (sem
ela os pontos inflam). Ambos afetam o realismo dos números, não a mecânica.

---

## Passo 11 — Best-N + Participação por atleta (pontuações realistas) ✅

**Objetivo:** tornar as pontuações realistas ao longo das temporadas, via regra
"melhores N resultados" e um modelo de participação por atleta (não todos entram
em tudo). Baseado no documento de diretrizes de calendário (sugestões #1 e #4).

**Entregue:**
- **Calendário real completo:** `scripts/buildCalendar.mjs` importa
  "2026 Events.txt" (texto oficial) → `calendar2026.js` com **67 eventos**
  Kyorugi/Senior reais (data, G-Rank, nome, local). Resolve o problema do
  PDF-imagem; exclui Poomsae/Virtual/Junior/Cadet/Team/Grand Slam/femininos.
- **Best-N** (`ranking.js`): `effectivePoints` soma só os `BEST_N=5` maiores
  resultados (já decaídos) — impede a inflação de pontos.
- **Participação** (`src/engine/participation.js`): `enterProbability` +
  `selectParticipants` + `recentLoad`. Atletas fortes priorizam eventos de grau
  alto; base "farma" G-1/G-2; fadiga (28→35 dias) limita eventos seguidos.
  Ligado ao Simulation Director no lugar do top-N fixo.
- `tests/participation.test.mjs` — 9 testes.

**Testado:** `npm test` → **101/101 passaram.**

**Calibração (por olho, documentada):** eventos/temporada — topo ~6 (seletivos),
mid ~9 (rodam o circuito), base ~5. **Efeito comprovado:** campeões de G-1 têm
ranking real médio ~45 (mid-tier vencem os Opens) enquanto G-6/G-10 são vencidos
pela elite (~13). Pontos de topo caíram de **>1000 para ~200–400** (realistas);
campeões passam a rotacionar entre temporadas.

---

## Passo 12 — Interface (mobile-first) ✅

**Objetivo:** interface para observar o mundo, seguindo as diretrizes (Mobile
First, Vanilla JS/ES Modules, sem frameworks, UI sem lógica de simulação).

**Entregue:**
- `index.html` + `src/styles/main.css` (tema claro/escuro, mobile-first).
- `src/app/gameController.js` — **fachada** de comandos/consultas; a UI nunca
  toca no `world`/engine diretamente. Agenda temporadas automaticamente.
- `src/ui/` — `app.js` (máquina de estados MENU→SIMULATION, barra superior com
  controles de tempo, navegação inferior, router), `dom.js`, `components.js`,
  e páginas: `ranking`, `calendar`, `news`, `countries`, `athlete` (modal).
- `src/main.js` — bootstrap (Storage localStorage + GameController + App).
- `docs/INTERFACE.md` — documento de arquitetura da UI.

**Verificado no navegador** (Chromium/Playwright, viewport 390×844): menu →
novo mundo → ranking (abas por categoria, atletas reais) → modal de atleta
(atributos visíveis em barras, estatísticas, histórico; ocultos não expostos) →
"Próximo evento" (simula e mostra pódios reais) → calendário, resultados e
países. Sem erros de console (só um 404 de favicon). Temas claro e escuro ok.

**Aderência às diretrizes:** separação absoluta UI×simulação (tudo via
GameController), componentização, máquina de estados, persistência em
localStorage, atributos ocultos preservados.

`npm test` → **101/101** (motor intacto).

---

## Ajuste — Início em 01/01/2026 e calendário anual completo ✅

**Pedido do usuário:** alinhar o início da simulação com o ano-calendário.

- `realSeed.js`: `WORLD_START_DATE` = **2026-01-01** (antes 2026-07-01).
- `GameController`: 1ª temporada agendada passa a ser **2026** (offset 0); ao
  virar o ano, agenda a próxima automaticamente.
- Calendário da UI: `getSeasonSchedule(ano)` + página reescrita mostra **todos os
  67 eventos do ano**, agrupados por mês, com status (realizado/a disputar) e
  navegação entre anos.
- Demos ajustados para começar em 2026.

**Verificado no navegador:** abre em 01/01/2026 · calendário 2026 com 67 eventos
(0 realizados no início) por mês · sem erros de console. `npm test` → 101/101.

**Aproximação documentada** (DECISIONS.md): o ranking-semente de junho/2026 é
usado como baseline de janeiro/2026.

---

## Passo 13 — Estrutura competitiva: teto de pontos e travas (lógica) ✅

**Objetivo:** implementar as regras do documento "Estrutura Competitiva e
Dinâmica de Ranking do Taekwondo Mundial" na lógica (UI depois — ver TODO).

**Entregue:**
- **Teto de pontos** (`ranking.js`): G-1/G-2 somam no máximo **40 pts/ano** por
  atleta; G-3+ ilimitados. Substituiu o best-N pelo mecanismo real da WT.
- **Continentes** (`src/config/continents.js`): 176 códigos IOC → 5 uniões
  continentais WT + conjunto de países árabes.
- **Elegibilidade** (`src/engine/eligibility.js`): classifica cada evento e
  aplica as travas — Grand Prix Series (top 32), Final (top 16), campeonatos
  continentais (continente + 1 país/categoria), President's Cup por continente,
  Arab Cup (só árabes). Integrado ao `participation.selectParticipants`.
- `tests/eligibility.test.mjs` — 13 testes; ajuste dos testes de ranking p/ teto.

**Testado:** `npm test` → **116/116 passaram.**

**Verificação no ecossistema (temporada real):** todo campeonato continental é
vencido por atleta do continente (Zandi/Ásia, Jendoubi/África, Oceania/AUS,
Pan-Am/VEN, Europeu/BLR); Grand Prix só com o top 32; Arab Cup só com árabes.
Pontos de líder caíram para ~450–600 (antes >1000) — ainda acima do real por
causa da dominância do favorito no combate (calibração no TODO).

**Adiado (lógica):** Mundial G-14, Olimpíadas G-20 + qualificação, Grand Slam,
periodização/pico de forma (#3) e lesões/rotatividade (#5).

---

## Passo 14 — Forma dinâmica (#3), Lesões e Recuperação (#5) + calibração ✅

**Objetivo:** aproximar os totais de ranking do real via zebras EXPLICÁVEIS
(forma/lesão), não ruído — e calibrar o combate.

**Entregue:**
- **Form System** (`engine/form.js`): forma por evento; elite periodiza (pico
  nos grandes, "desligada" nos pequenos) + variação "forma do dia". Vira
  multiplicador TEMPORÁRIO sobre os atributos, só naquele combate; o Combat
  Engine recebe atributos efetivos do dia. Integrado ao competitionSystem.
- **Injury System** (`engine/injuries.js`): desgaste cumulativo + risco de lesão
  por carga/desgaste/durabilidade; afasta o atleta (semanas a meses).
- **Recovery System** (`engine/recovery.js`): roda no pipeline (§4), reativa
  quem voltou. Eventos `AthleteInjured`/`AthleteRecovered` no World Event Bus.
- **Calibração do combate** (`probability.js` `COMBAT_CONFIG.k=0.03`): curva mais
  realista (iguais 51%, gap4 64%, gap10 80%, gap24 98%).
- `condition` no atleta + `world.injuries`. Lesionados saem dos campos
  automaticamente (participation usa só "ativo") e decaem no ranking.
- `tests/form.test.mjs` + `tests/injuries.test.mjs` — 11 testes.

**Testado:** `npm test` → **127/127 passaram.**

**Descoberta importante (medida):** o total de pontos do líder é praticamente
INVARIANTE ao `k` do combate — é função do total de pontos disponíveis no
calendário, não da inclinação. Por isso a solução certa foi forma+lesões
(rotação/narrativa) + `k` moderado, não achatar o `k`.

**Resultado (4 temporadas):** top-8 por categoria em ~266–464 (o grosso do
ranking bate a faixa real ~206–310; só os 1–2 primeiros ficam altos, um campeão
dominante plausível). **15 de 16 Grand Prix Finals com campeões diferentes**
(rotação real). ~3% do plantel lesionado a cada momento.

**Pendência de calibração (TODO):** o topo (1º–2º) ainda ~30% acima do real;
reduzir exigiria limitar comparecimento/pódios em grandes eventos — além dos
documentos atuais (precisa de decisão). Também: envelhecimento/aposentadoria +
geração de jovens (próxima grande alavanca de realismo de longo prazo).

---

## Passo 15 — Indicadores visuais e telas ricas na UI ✅

**Objetivo:** melhorar a interface para humanos (bandeiras, movimento, telas
detalhadas de campeonato e atleta).

**Entregue:**
- `src/config/flags.js` — IOC→ISO-2 (176 países) → **bandeira emoji**. Exibida em
  ranking, ficha do atleta, países, resultados, campeonato e pódios.
- **Setas de movimento** no ranking (▲ verde / ▼ vermelha com nº / — / novo).
  GameController tira snapshot das posições antes de cada avanço; `getRanking`
  devolve `delta`.
- **Modal de Campeonato clicável** (`ui/pages/competition.js`): antes → campo
  projetado (prováveis inscritos, respeitando as travas; Opens sem a elite);
  depois → classificação final por peso + resultados das lutas por rodada.
  Persistimos as lutas de forma compacta em `competition.matches`.
- **Ficha do atleta**: bandeira, status "lesionado até…", **próximos
  campeonatos** (campo projetado) e histórico clicável (abre o campeonato).
- Novas consultas no GameController: `getCompetitionView`, `projectedField`,
  `getAthleteUpcoming`, `getScheduledYears`, deltas e bandeiras.
- `tests/uiQueries.test.mjs` — 6 testes.

**Testado:** `npm test` → **133/133 passaram.** Verificado no navegador
(Chromium): bandeiras, setas, resultados de campeonato (classificação + lutas),
campo projetado (US Open G-2 mostra atletas #177–204, não a elite), inscrições
do atleta — sem erros de console.

---

## Passo 16 — Favoritos/Busca, País, Notícias de lesão, ranking completo ✅

**Objetivo:** mais telas e indicadores para humanos.

**Entregue (lógica no GameController; UI só consome):**
- **News System** (`engine/news.js`) — o Director registra campeões, **lesões** e
  **recuperações** em `world.news` (limitado). `getNews` mescla com o histórico.
- **Ranking completo:** `getRanking` sem limite → **todos** os 256 atletas da
  categoria; cada linha indica `injured`. UI mostra selo ✚ e contador.
- **Ranking de início do campeonato nos confrontos:** o Director guarda
  `aRank`/`bRank` na luta (posição antes de recalcular o ranking); a UI mostra
  `#N` ao lado do nome nas lutas.
- **Favoritos + Busca:** `getFavoriteAthletes`, `searchAthletes`; nova aba.
- **Detalhe de país:** `getCountryView` (medalhas, continente, melhor por
  categoria, atletas); modal clicável em Países.
- UI: `pages/favorites.js`, `pages/country.js`, `pages/news.js` (reescrita),
  selo de lesão no ranking, 5ª aba (Favoritos).
- `tests/uiQueries.test.mjs` — +7 testes.

**Testado:** `npm test` → **139/139.** Verificado no navegador: 256 linhas no
ranking, 5 selos de lesão, 19 notícias médicas, busca, modal de país, ranks nos
confrontos — sem erros de console.

**TODO adicionado (lógica):** impedir que um atleta participe de 2 campeonatos no
mesmo dia.

---

## Passo 17 — Sistema de Rivalidades (lógica + UI + documento) ✅

**Objetivo:** quando dois atletas se enfrentam repetidamente em fases decisivas
(finais/semifinais), sobretudo em GRANDES eventos, forma-se uma **rivalidade**
que deixa os confrontos mais imprevisíveis (a "gana" do clássico). Pedido do
usuário: dar **muito mais peso a grandes eventos** (Mundiais/Olimpíadas valem
mais), **documentar** a mecânica e **gerar a UI junto** (logic+UI no mesmo passo).

**Entregue (lógica):**
- `src/engine/rivalry.js` — **NOVO**. Agregado minúsculo e permanente por par
  (`world.rivalries[pairKey]`): encontros, retrospecto (h2h), intensidade com
  **peso por evento** (`championPoints/10` → G-1=1 … Olimpíada G-20=20) e **peso
  por fase** (final 3, semi 2). Intensidade **esfria** (meia-vida 30 meses) e é
  **podada** abaixo de `MIN_INTENSITY`. Não guarda log de lutas — só o agregado.
- `src/engine/combat/fightManager.js` — se há rivalidade, `simulateFight` aplica
  uma perturbação aleatória **simétrica** nos atributos dos dois lados (até ±8%
  no auge). Não favorece ninguém em média — só **aumenta a variância** (mais
  zebras). Estado temporário, nenhum atributo permanente é alterado.
- `src/engine/competitionSystem.js` — consulta a rivalidade **do par** antes de
  cada luta (`rivalryLookup`) e a repassa ao Combat Engine; grava `rivalry` na luta.
- `src/engine/simulationDirector.js` — passa o `rivalryLookup` (nível decaído até
  a data) e, na fase de consequência, chama `updateRivalriesFromCompetition` +
  `pruneRivalries`. O **próximo** evento já usa o estado novo.
- `src/core/world.js` — `rivalries: {}` no estado do mundo.

**Entregue (UI):**
- **Ficha do atleta:** seção **"Rivais"** — chamas 🔥 (intensidade), bandeira,
  nome, nº de encontros, último grande palco e retrospecto (ex.: `4–2`);
  clicável → abre o rival. (`gameController.getAthleteRivals` + `pages/athlete.js`).
- **Tela de campeonato:** selo 🔥 nos confrontos que foram **duelos de rivais**.
- Estilos em `main.css` (`.rival-row`, `.rival-heat`, `.h2h`, `.rival-badge`).

**Documento:** `docs/RIVALRIES.md` — modelo de dados, formação com peso G-Rank,
efeito no combate, lugar no pipeline, UI e tabela de calibração.

**Testado:** `npm test` → **148/148 passaram.** `tests/rivalry.test.mjs` (9):
pairKey canônica; só finais/semis criam rivalidade; grandes eventos pesam muito
mais (G-1=3 vs G-20=60); retrospecto/encontros acumulam; decaimento ~30 meses;
`rivalryLevel` normaliza 0..1; poda das fracas/frias; a rivalidade aumenta as
zebras (favorito vence menos, mas ainda >50%); determinismo.

**Verificado no navegador** (Chromium, 390×844): após ~1 temporada, 242
rivalidades ativas; ficha do atleta mostra a seção "Rivais" com dados reais
(nomes, 🔥, retrospecto 2–0/1–0, último palco G-4/G-6) — sem erros de console.

**Nota (save):** o teste de navegador reconfirmou que o `localStorage` estoura a
cota após ~1 temporada com o histórico detalhado. As rivalidades **não** são a
causa (são ~90 KB permanentes); reforça a pendência de retenção/IndexedDB (TODO).

---

## Ajuste — Ranking mensal (materialização no dia 1) ✅

**Pedido do usuário:** o ranking deve atualizar (visualmente) **apenas no dia 1
de cada mês**; nesse dia rodam os cálculos de decaimento. Ex.: um evento de
março/2026 cai no decaimento (75%) quando o sistema calcula o ranking vigente em
abril/2027 (em março ele perdeu força; o ranking de abril mostra isso).

**Feito:**
- `simulationDirector.js`: `recomputeRankings` saiu de cada competição. O
  **ledger** segue sendo creditado por evento (`applyCompetitionPoints`), mas o
  ranking materializado (posições/pontos visíveis + `world.rankings` + pontos
  nacionais) só é recalculado em `_monthlyRankingUpdate`, disparado no dia 1 do
  mês. O decaimento (§5) é avaliado nessa data. `RankingUpdated` passa a ser
  emitido no dia 1 (não mais por competição).
- `tests/rankingCadence.test.mjs` (novo, 3 testes): competição no meio do mês
  credita o ledger mas NÃO mexe no ranking visível; `RankingUpdated` só no dia 1;
  o decaimento é aplicado na data do recálculo mensal (queda de faixa).
- `tests/uiQueries.test.mjs`: teste de setas de movimento ajustado à cadência
  mensal (avança até cruzar um fim de mês).

**Testado:** `npm test` → **151/151.** Verificação headless pelo GameController
(mesma via da UI): ao longo de 13 meses, o ranking de WC-M-58 muda **somente**
nos dias 01 (mar–dez/2026 e jan–fev/2027), nunca no meio do mês.

**Ganhos:** mais realista (ciclo mensal da WT; participação usa o ranking mensal
vigente), mais performático (~12 recálculos/ano vs ~67) e mais simples de manter
(um único ponto de recálculo). Detalhes em DECISIONS.md.

---

## Passo 18 — Roster completo (todos os rankeados) + UI virtualizada ✅

**Pedido do usuário:** incluir na database TODOS os atletas rankeados (o custo de
criar a database é baixo) e fazer as mudanças de UI necessárias para a
performance não sofrer.

**Feito:**
- **Roster completo:** `LIMIT_PER_CATEGORY = Infinity` em `scripts/buildRoster.mjs`.
  De 1.024 → **3.092 atletas** (M-58:992, M-68:1028, M-80:659, M+80:413), 176
  países. `realRoster.js` gerado: ~283 KB (só build-time).
- **Lista virtualizada** (`src/ui/virtualList.js`, novo): o ranking renderiza só a
  janela visível (~24 linhas no DOM em vez de ~1.000) sobre um espaçador de altura
  total; recalcula na rolagem via `requestAnimationFrame`, com referência no
  viewport. `pages/ranking.js` usa o helper e descarta o listener anterior ao
  trocar de categoria. CSS: `.vlist`/`.vrow` (passo de linha 72 px).
- **Cache de campo projetado** (`gameController._fieldCache`): memoiza o campo por
  (competição|categoria), invalidado a cada avanço. Abrir fichas deixou de
  recalcular sobre ~1.000 atletas toda vez.
- **Save não fatal** (`StorageService.save`): não propaga `QuotaExceededError`; a
  simulação segue em memória e o Director emite `WorldSaveFailed`.

**Medições (roster completo):** build 81 ms · 1 temporada 1,3 s · save inicial
3,14 MB → 6,55 MB após 1 temporada (passa do limite do localStorage — reforça a
retenção/IndexedDB do TODO). UI: `getRanking` categoria inteira ~1 ms; ficha
fria ~70 ms, quente ~0,4 ms; DOM do ranking ~24 linhas.

**Testado:** `npm test` → **152/152** (novo teste: roster inclui a cauda longa;
setas de movimento já ajustadas à cadência mensal). Verificado no navegador
(Chromium 390×844): badge "992", 24 linhas no DOM, rolagem mostra posições
589–612 corretamente, sem erros de console.

**Aviso registrado:** o save inicial (~3,1 MB) e o crescimento por temporada
tornam a retenção + IndexedDB (TODO) agora **prioritária**; o save não fatal é só
um paliativo para não quebrar a simulação.

---

## Passo 19 — Persistência em IndexedDB (fase 1 do save) ✅

**Pedido do usuário:** migrar o save para IndexedDB (o roster completo estoura o
localStorage). Retenção fica para o passo seguinte. Discutido: IndexedDB remove o
teto de disco, mas RAM/serialização/décadas ainda pedem retenção.

**Feito (sem tocar no motor, que é síncrono):**
- `src/services/idb.js` (novo) — `IndexedDBBackend`: interface síncrona
  (`get/set/remove/keys`) sobre um cache hidratado do IndexedDB em `init()`
  (await no boot); gravações em segundo plano, não fatais.
- `src/services/storage.js` — modo **adiado** (`deferMs`): agrupa o save de cada
  dia de um "próximo evento" e serializa UMA vez no `flush` (debounce). Mata o
  `JSON.stringify` por dia.
- `src/main.js` — boot assíncrono com fallback IndexedDB → localStorage →
  memória; migração única do save antigo do localStorage; `flush()` ao ocultar/
  sair da página.
- `tests/services.test.mjs` — +2 testes (agrupamento do modo adiado; remove
  cancela pendente).

**Testado:** `npm test` → **154/154.** Verificado no navegador (Chromium):
- pior "próximo evento" **675 ms → 45 ms** (serializa 1×/burst, não por dia);
- novo jogo grava só no **IndexedDB** (não no localStorage); reload → "Continuar"
  retoma na mesma data;
- 80 eventos (> 1 temporada, **7,55 MB**) sem estourar cota nem erros — onde o
  localStorage quebrava perto de 5 MB.

**Pendente (próximo):** retenção (Camada 1) para limitar RAM/serialização no
longo prazo (décadas): G-1/G-2 só medalhistas após 1 ano; grandes eventos por
completo; poda do ledger > 4 anos; limitar `athlete.history`.

---

## Estado: núcleo + dados reais + temporadas + participação + travas + forma/lesões + INTERFACE rica + rivalidades + roster completo + IndexedDB ✅

O motor roda um campeonato completo sem interface, de forma determinística e
seguindo os documentos de arquitetura. A partir daqui, expansões entram por
extensão (ver TODO.md): categorias femininas, seed completo (~2.200 atletas),
demais systems (Training/Recovery/AI/News), múltiplas temporadas com calendário
anual, e por fim a interface mobile-first.
