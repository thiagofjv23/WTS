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

## Estado do Núcleo: COMPLETO ✅

O motor roda um campeonato completo sem interface, de forma determinística e
seguindo os documentos de arquitetura. A partir daqui, expansões entram por
extensão (ver TODO.md): categorias femininas, seed completo (~2.200 atletas),
demais systems (Training/Recovery/AI/News), múltiplas temporadas com calendário
anual, e por fim a interface mobile-first.
