# Perfil do Atleta e decisão de calendário (Opens G-1/G-2)

Sistema de tomada de decisão dos atletas (NPCs) para o calendário de Opens.
Fonte: pedido do usuário. Código: `src/engine/athleteProfile.js`,
`src/engine/tournamentRegion.js`, `src/engine/participation.js`.

## Perfil (atrelado à posição no ranking)

O perfil NÃO é guardado no atleta — deriva da **posição atual no ranking**
(`profileForRank`), então muda sozinho quando o atleta sobe/desce:

| Perfil | Ranking | Comportamento | Urgência em Opens |
|---|---|---|---|
| **Elite** | 1º–5º | Foco em GP, Mundial e Olimpíada | Baixíssima (aquecimento) |
| **Agressivo** | 6º–32º | Caça pontos p/ entrar/manter vaga em GP e G-Slam | Altíssima (até o teto de 40) |
| **Escalador** | 33º–100º | Busca consistência p/ tentar o top 32 | Alta, limitada pela geografia |
| **Local** | 101º+ | Luta para existir no ranking e ganhar experiência | Média (só na sua faixa continental) |

Sem posição (não ranqueado) → **Local**.

## Planejamento anual (início do ano)

**No dia 1º de janeiro** (após materializar o ranking), cada atleta planeja de uma
vez os Opens do ano (`openPlanner.planOpenSeason`) — não decide mais evento a
evento. Isso corrige a prioridade local e permite respeitar fadiga e decaimento.

Aplica-se a G-1/G-2 que **não** sejam por convite, o Grand Slam Challenge, nem
eventos de tipo especial (Seletiva, etapas olímpicas) — `isRegularOpen`.

Para cada atleta:

1. **Nº-alvo de Opens no ano** = base do perfil + bônus de **decaimento** (ver
   abaixo), limitado ao teto do perfil (`PROFILE_SEASON`).
2. **Candidatos**: Opens elegíveis com **Score = PtsDoTorneio − DistancePenalty**
   (G-1=10, G-2=20). Score ≤ 0 é descartado.
3. **Ordem de escolha**: **CASA primeiro** (torneio no país do atleta), depois
   maior **Score**, depois data mais cedo. → um G-2 em casa nunca é trocado por um
   G-1 fora.
4. **Fadiga**: só adiciona um Open se respeitar o intervalo mínimo entre eventos
   (`minRestDays`) e o teto por mês (`maxPerMonth`) — nunca dois no mesmo dia.

O plano fica em `athlete.openPlan = { season, ids }`. Quando o Open roda, o campo
são os atletas que o planejaram (ativos e sob o teto de 40), com um campo mínimo
garantido e a prioridade nacional/continental abaixo.

### Agressividade por decaimento

Ao planejar, o atleta estima quantos pontos vai **perder no ano** pelo decaimento
do ranking (`effectivePoints` no início vs. fim do ano). Quanto maior a perda,
mais Opens ele mira (do `base` ao `max` do perfil, saturando em
`DECAY_AGGRESSION_REF`) — para tentar repor os pontos e se manter no nível.

### Reajuste mensal (dia 2)

`adjustPlansForInjuries` roda **no dia 2 de cada mês**: se o atleta perdeu um Open
planejado (lesão o tirou, ou não entrou no campo), solta a vaga e — se for
**Agressivo/Escalador** — busca um **substituto** futuro (respeitando a fadiga).
**Elite/Local** apenas ficam com um Open a menos.

### Fadiga e o bug de mesmo-dia

Ninguém disputa **dois campeonatos no mesmo dia**. Além do espaçamento no plano, o
Simulation Director processa os eventos do dia do **maior grau para o menor** e
marca quem já competiu (`condition.lastCompetitionDate`), removendo-o dos demais
eventos daquele dia — então, num conflito, o atleta fica no evento mais importante.

### DistancePenalty (por proximidade e por perfil)

`penalidade = nível_de_distância × penaltyPerLevel(perfil)`. O nível vem da
matriz de continentes (0 mesmo, 1 vizinho, 2 médio, 3 longe; Ásia↔América = 3):

| Perfil | penaltyPerLevel | nº-alvo Opens/ano (base–max) | Efeito |
|---|---|---|---|
| Local | 100 | 3–6 | Só o **próprio continente** (qualquer viagem inviabiliza) |
| Escalador | 8 | 4–9 | Mesmo + **vizinho** (G-2 vizinho = 20−8=12) |
| Agressivo | 5 | 6–12 | Alcança **médio/longe** quando precisa (G-2 vizinho = 15) |
| Elite | 14 | 1–3 | Praticamente só em casa (aquecimento) |

Assim um **Local** nunca vai da Ásia para a América, mas um **Agressivo/Escalador**
consegue ir a um continente vizinho se precisar de pontos.

A **região do torneio** vem do país do local (`tournamentRegion.js`, casando o
nome do país do `location` ao roster). Local não resolvido → sem penalidade e sem
prioridade (Open genérico).

## Composição do campo (prioridade nacional/continental)

Entre os interessados, o campo é montado com prioridade:

- **G-1:** atletas da **nacionalidade** do torneio primeiro, depois os demais.
- **G-2:** reserva **50%** para a nacionalidade e **≥15%** para o continente; o
  restante é aberto, e as cotas não preenchidas passam aos demais interessados.

Um campo mínimo é garantido (completa com quem passou nas travas, por Score).

## Contador de Opens (X/40)

Cada atleta acumula `openPoints` (pontos ganhos em G-1/G-2 no ano), creditados em
`applyCompetitionPoints`. Segue o **teto de 40** já existente (trava o farm ao
chegar em 40) e **zera na virada de ano**, de forma preguiçosa (reseta ao ser
lido/escrito num ano novo).

Na interface, a tela do atleta mostra **X/40** ao lado dos pontos de ranking, em
fonte menor (contador de Opens do ano).

## Parâmetros (`src/engine/athleteProfile.js`)

| Constante | Papel |
|---|---|
| `AthleteProfile` | enum Elite/Aggressive/Climber/Local |
| `profileForRank(pos)` | perfil pela posição |
| `PROFILE_PARAMS` | `penaltyPerLevel` por perfil (tolerância a viagem) |
| `PROFILE_SEASON` | nº-alvo de Opens no ano (base/max) por perfil |
| `DECAY_AGGRESSION_REF` | perda de pontos que satura a agressividade |
| `FATIGUE` | `minRestDays` e `maxPerMonth` (espaçamento do calendário) |
| `CONTINENT_DISTANCE` | matriz de distância entre continentes |
| `OPEN_POINTS_CAP` | 40 (teto anual de Opens) |

Planejamento e reajuste ficam em `src/engine/openPlanner.js`
(`planOpenSeason`, `adjustPlansForInjuries`, `plannedOpenField`).

## Pendente / futuro

- O perfil hoje dita só a lógica de Opens; pode dirigir o calendário inteiro
  (quais G-events priorizar) numa evolução futura.
- Ajuste fino das penalidades/cotas/fadiga após observar várias temporadas.
