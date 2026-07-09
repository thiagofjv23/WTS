# World Taekwondo Simulator

Simulador de ecossistema mundial de Taekwondo — um mundo esportivo persistente
que evolui ao longo de temporadas: atletas, países, competições, rankings e
histórico. Vanilla JS (ES Modules), orientado a eventos, determinístico por seed.

> Este repositório contém primeiro a **documentação de arquitetura** (arquivos
> `.md` na raiz) e agora a **implementação do núcleo** em `src/`. A implementação
> segue fielmente esses documentos.

## Estado atual (núcleo validado no console)

O motor já roda um campeonato inteiro ponta a ponta, sem interface:
`calendário → competição → combate → consequências → ranking → histórico → save`.

```bash
node scripts/demoMultiSeason.mjs  # VÁRIAS temporadas (calendário 2026 + decaimento)
node scripts/demoSeason.mjs       # uma temporada inteira com eventos/atletas REAIS
node scripts/demoReal.mjs         # um Grand Prix com ATLETAS REAIS
node scripts/demo.mjs             # Aberto G-1 com atletas sintéticos (gerados)
npm test                          # 92 testes
npm run build:roster              # regenera roster + eventos reais a partir do .xlsx
npm run build:calendar            # regenera o calendário 2026 a partir do .txt oficial
npm run build:names               # regenera o dicionário de nomes (atletas gerados)
```

### Base de dados de atletas (híbrido)

O mundo é semeado a partir do **ranking olímpico oficial da World Taekwondo**
(`12. Olympic_Kyorugi_Rankings_June_2026.xlsx`): nome, país, categoria e pontos
são **reais**; idade e atributos são **gerados** e ancorados na posição do
ranking (favoritos reais nascem fortes). Escopo atual: TOP 256 das 4 categorias
masculinas (~1.024 atletas). Ver `DECISIONS.md`.

O **calendário** vem do calendário oficial WT 2026 (`calendar2026.js`, apenas
Kyorugi/Senior): **67 competições reais** com datas, G-Rank, nome e local
(incluindo Grand Prix Series G-6 e Grand Prix Final G-10). O simulador roda
**múltiplas temporadas consecutivas** com **decaimento de pontos de 4 anos** (§5)
e a regra **"melhores N resultados contam"**, mantendo as pontuações realistas.

Cada atleta **escolhe em quais eventos competir** (participation.js): os fortes
priorizam os grandes eventos, os de base "farmam" pontos nos Opens, e a fadiga
limita competições em sequência. Resultado: os Opens (G-1) são vencidos por
atletas de nível médio e os grandes eventos pela elite — o ranking evolui e os
campeões rotacionam ao longo dos anos.

## Arquitetura do código (`src/`)

```
services/   random.js (RNG com seed) · eventBus.js · storage.js · nameGenerator.js · logger.js
config/     attributes.js · weightCategories.js
entities/   athlete.js · country.js · competition.js        (dados apenas)
engine/     generation.js · combat/ · brackets.js · competitionSystem.js
            ranking.js · consequence.js · history.js · calendar.js · simulationDirector.js
core/       world.js (estado global serializável)
database/   seedConfig.js · seed.js · names.js (gerado)
utils/      ids.js · dates.js
```

Princípios (dos documentos de arquitetura): separação absoluta dados/regras/
coordenação; comunicação por Event Bus; determinismo por seed; IDs permanentes;
tudo serializável em JSON.

## Escopo e rastreabilidade

- **`TODO.md`** — tudo que foi deliberadamente adiado (ex.: categorias femininas,
  seed completo, UI, repescagem olímpica, decaimento de pontos).
- **`DECISIONS.md`** — decisões de implementação onde os documentos deixaram
  espaço em aberto (fórmulas de combate, tabela de ranking, etc.).
- **`docs/PROGRESS.md`** — diário passo a passo do desenvolvimento.

## Documentos de arquitetura (raiz)

`DiretrizdeArquiteturadoProjeto.md`, `DocumentodeArquiteturadeSoftware.md`,
`DataArchitecture.md`, `SimulationPipeline.md`, `SimulationRules.md`,
`athlete_attributes.md`, `combat_framework.md`, `combat_system.md`,
`fight_algorithm.md`, `random_system.md`, `simulation_director.md`,
`world_event_bus.md`, `taekwondo-ranking.md`, `seed_inicial.md`.
