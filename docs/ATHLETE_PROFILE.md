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

## A decisão (só para Opens comuns G-1/G-2)

Aplica-se a G-1/G-2 que **não** sejam por convite nem o Grand Slam Challenge
(`isRegularOpen`). Para cada atleta elegível:

1. **Teto:** se `openPoints` do ano ≥ **40**, não entra (já farmou o teto).
2. **Cota trimestral:** se já disputou o máximo do trimestre para o seu perfil,
   não entra (Elite 1, Agressivo 4, Escalador 3, Local 2).
3. **Score = PtsDoTorneio − DistancePenalty.** PtsDoTorneio = grau (G-1=10,
   G-2=20). Se `Score ≤ 0`, não entra. O atleta prefere o maior Score.
4. **Forma do dia:** a entrada é sorteada com probabilidade que cresce com a
   forma — assim os fortes se **espalham** pelos Opens do ano em vez de lotarem os
   primeiros (e cada um decide fazer vários ou só 1–2 no trimestre).

### DistancePenalty (por proximidade e por perfil)

`penalidade = nível_de_distância × penaltyPerLevel(perfil)`. O nível vem da
matriz de continentes (0 mesmo, 1 vizinho, 2 médio, 3 longe; Ásia↔América = 3):

| Perfil | penaltyPerLevel | Efeito |
|---|---|---|
| Local | 100 | Só o **próprio continente** (qualquer viagem inviabiliza) |
| Escalador | 8 | Mesmo + **vizinho** (G-2 vizinho = 20−8=12) |
| Agressivo | 5 | Alcança **médio/longe** quando precisa (G-2 vizinho = 15) |
| Elite | 14 | Praticamente só em casa (e raramente, pela urgência baixa) |

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

Cada atleta acumula `openPoints` (pontos ganhos em G-1/G-2 no ano) e `openEntries`
(disputas no trimestre) — creditados em `applyCompetitionPoints`. Seguem o **teto
de 40** já existente e **zeram na virada de ano** (openPoints) / de trimestre
(openEntries), de forma preguiçosa (resetam ao serem lidos/escritos num período
novo).

Na interface, a tela do atleta mostra **X/40** ao lado dos pontos de ranking, em
fonte menor (contador de Opens do ano).

## Parâmetros (`src/engine/athleteProfile.js`)

| Constante | Papel |
|---|---|
| `AthleteProfile` | enum Elite/Aggressive/Climber/Local |
| `profileForRank(pos)` | perfil pela posição |
| `PROFILE_PARAMS` | cota trimestral, interesse-base e penaltyPerLevel por perfil |
| `CONTINENT_DISTANCE` | matriz de distância entre continentes |
| `OPEN_POINTS_CAP` | 40 (teto anual de Opens) |

## Pendente / futuro

- O perfil hoje dita só a lógica de Opens; pode dirigir o calendário inteiro
  (quais G-events priorizar) numa evolução futura.
- Ajuste fino das penalidades/cotas após observar várias temporadas.
