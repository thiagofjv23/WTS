# Grand Slam Champions Series

Documento da mecânica do Grand Slam.

## O que é

O **Grand Slam Champions Series** é o torneio mais prestigiado do calendário: um
evento **anual, de fim de ano e por CONVITE**, em que apenas os **melhores do
ranking** disputam. No mundo real, o campeão do Grand Slam ganha uma **vaga
olímpica** ("porta de entrada olímpica" — Estrutura Competitiva §7).

Com os dados que já temos (ranking, categorias, chaveamento e o sistema de
travas), ele é montado como um **torneio de eliminação simples** normal — só que
fechado à elite.

---

## Estrutura

| Aspecto | Valor |
|---|---|
| Quando | **fim de dezembro** (clímax da temporada, após o Grand Prix Final) |
| Formato | eliminação simples, todas as 4 categorias |
| Convite | **top 16 do ranking** por categoria (`GRAND_SLAM_FIELD = 16`) |
| Grau | **G-12** (campeão = 120 pts) |
| Local | Wuxi, China (sede histórica) |
| Combate | normal (forma + rivalidade) — é evento oficial |

O **grau G-12** o posiciona **acima do Grand Prix Final (G-10)** e abaixo do
Mundial (G-14): o evento invitational mais valioso do ano. Como todo evento
oficial, **pontua no ranking** (120 ao campeão, 72 ao vice, etc., pela tabela de
colocação §2).

---

## Como funciona no pipeline

1. **Agendamento** (`scheduleGrandSlam`): junto de cada temporada, o
   GameController agenda um Grand Slam em `AAAA-12-12` com as 4 categorias.
2. **Convite** (`eligibility.classifyEvent`): o evento é reconhecido pelo nome
   ("grand slam") e recebe a trava `rankingLockTopN = 16` — só o top 16 do
   ranking vigente entra, e por ser invitational todos os elegíveis comparecem
   (sem sorteio de participação). Lesionados do top 16 ficam de fora (campo
   menor), como em qualquer evento.
3. **Torneio**: o Competition System monta o chaveamento (seeding por ranking,
   byes aos melhores) e roda as lutas pelo Combat Engine normal.
4. **Consequência**: pontos no ledger, medalhas, histórico, rivalidades — tudo
   como um evento oficial.

Nada de novo no núcleo: reaproveita o mesmo caminho dos demais torneios; só o
agendamento e a trava de convite são específicos.

---

## Na interface

Aparece no **Calendário** e na **tela de campeonato** como qualquer torneio:
selo de grau **G-12**, rótulo **"Grand Slam Champions Series"**, chip de trava
"Convite: top 16 do ranking", campo projetado (os 16 convidados) antes e a
classificação + chaveamento depois.

---

## Parâmetros

Em `src/engine/grandSlam.js`:

| Constante | Valor | Papel |
|---|---|---|
| `GRAND_SLAM_GRANK` | `"G-12"` | grau/pontos (campeão 120) |
| `GRAND_SLAM_FIELD` | 16 | convidados por categoria (top N) |

---

## Pendente / futuro

- **Vaga olímpica ao campeão:** a "porta de entrada olímpica" só faz sentido
  quando existirem Olimpíadas (G-20) e a classificação olímpica (§7). Hoje o
  Grand Slam é o torneio; a vaga entra junto com o ciclo olímpico (TODO).
- **Calibração de pontos:** por concentrar 120 pts anuais na elite, o Grand Slam
  reforça o topo do ranking (que já fica ~30% acima do real). Revisar junto da
  calibração geral do topo (TODO).
