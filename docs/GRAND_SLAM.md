# Grand Slam (Challenge + Finals)

Documento da mecânica do Grand Slam no seu formato **real de dois eventos**.

## O que é

O Grand Slam é o clímax da temporada, disputado em **dois eventos** de fim de ano:

1. **Grand Slam Challenge (G-2):** uma **seletiva ABERTA**, 2 dias antes das
   Finais. Sem limite de atletas. O campeão e o vice ganham **wildcards** para as
   Finais. Pontua no **ranking normal** (G-2).
2. **Grand Slam Finals:** só **10 atletas válidos** por peso. Não pontua no
   ranking normal — alimenta um **Ranking de Mérito Grand Slam** separado.

Só a partir de **2027**: é quando o Mundial passa a existir (bienal) e todos os
classificados vêm direto da simulação (sem hardcode).

---

## Grand Slam Challenge (G-2)

| Aspecto | Valor |
|---|---|
| Quando | **10 de dezembro** (2 dias antes das Finais) |
| Campo | **aberto** — sem limite de atletas (`fieldSize = 0`) |
| Formato | eliminação simples + **disputa de 3º lugar** (um único bronze, 4º distinto) |
| Grau | **G-2** — pontua no ranking normal (campeão 20 pts) |
| Produz | os **2 qualificados** de cada peso para as Finais |

**Qualificados (regra de mesmo país).** As duas vagas vão ao **campeão** e ao
próximo colocado **de outro país**: se o vice for do país do campeão, a 2ª vaga
escorrega para o 3º, depois 4º… até achar um atleta de país diferente do campeão
(`grandSlamChallengeQualifiers`).

---

## Grand Slam Finals

| Aspecto | Valor |
|---|---|
| Quando | **12 de dezembro** |
| Campo | **10 atletas válidos** por peso (`GRAND_SLAM_FINALS_FIELD = 10`) |
| Chave | **16 com 6 byes** (`GRAND_SLAM_BRACKET = 16`) |
| Cabeças-de-chave | **campeão do GP Final (seed 1)** e **Campeão Mundial (seed 2)** — byes garantidos |
| Formato | eliminação simples + **disputa de 3º lugar** |
| Pontuação | **Ranking de Mérito** (NÃO pontua no ranking normal) |

**Os 10 válidos** por peso:

- campeão **e** vice das **3 etapas do Grand Prix Series** do ano (6),
- **campeão do Grand Prix Final** (1),
- **Campeão Mundial** vigente (1),
- os **2 qualificados do Grand Slam Challenge** (2).

Deduplicados (um atleta pode acumular fontes) e, se sobrarem vagas, **completa
até 10 pelo ranking**. **Lesão:** a vaga de um válido lesionado passa ao **3º do
Challenge** (depois seguintes; por fim, o ranking).

Como há **6 byes** para **10 atletas**, os **6 primeiros seeds** avançam direto;
forçar o campeão do GP Final e o Campeão Mundial aos seeds 1–2 garante os byes
deles. A 1ª rodada tem, portanto, **2 lutas** (os 4 piores seeds).

### Ranking de Mérito Grand Slam

Um ranking **SEPARADO**, que conta **apenas** os pontos das Finais e é exibido
**só na tela da competição** (`world.grandSlamMerit`).

| Colocação | 1º | 2º | 3º | 4º | 5º (×4) | 9º (×2) |
|---|---|---|---|---|---|---|
| Pontos | 1000 | 600 | 360 | 216 | 151 | 106 |

**Decaimento: 50% ao ano, válido 2 anos** (diferente do ranking normal, de 4
anos). Após 1 ano: 500 / 300 / 180 / 108 / 75,5 / 53. Após 2 anos: expira.

---

## Como funciona no pipeline

1. **Agendamento** (`scheduleGrandSlam`): o par Challenge (10/dez) + Finals
   (12/dez) é agendado a cada temporada **a partir de 2027**.
2. **Challenge**: evento oficial G-2 aberto — participação voluntária normal,
   com **disputa de 3º lugar** ligada (`thirdPlaceMatch`). Ao final,
   `grantGrandSlamChallengeQualifiers` grava os 2 qualificados por peso.
3. **Finais**: o campo são os 10 válidos (`resolveGrandSlamFinalists`), no
   **seeding pronto** (`preseeded`), com disputa de 3º lugar. Em vez de pontos de
   ranking, `applyGrandSlamMerit` credita o mérito. Medalhas, histórico, lesões e
   rivalidades seguem como em qualquer evento oficial.

---

## Na interface

- **Challenge**: aparece como um Open G-2 comum (com disputa de bronze).
- **Finais**: rótulo **"Grand Slam Finals (Mérito)"**, campeão valendo **1000**
  de mérito, e um bloco **"Ranking de Mérito Grand Slam"** com o decaimento de
  50%/ano — exibido **apenas** nessa tela.

---

## Parâmetros

Em `src/engine/grandSlam.js`:

| Constante | Valor | Papel |
|---|---|---|
| `GRAND_SLAM_CHALLENGE_GRANK` | `"G-2"` | grau do Challenge (pontua no ranking) |
| `GRAND_SLAM_FINALS_GRANK` | `"G-12"` | rótulo das Finais (não pontua no ranking) |
| `GRAND_SLAM_FINALS_FIELD` | 10 | válidos por peso nas Finais |
| `GRAND_SLAM_BRACKET` | 16 | tamanho da chave (10 + 6 byes) |
| `GRAND_SLAM_FIRST_YEAR` | 2027 | 1ª edição do formato remodelado |
| `GRAND_SLAM_MERIT_POINTS` | tabela | pontos de mérito por colocação |

---

## Pendente / futuro

- **Vaga olímpica ao campeão:** a "porta de entrada olímpica" entra com o ciclo
  olímpico (G-20) e a classificação (TODO).
- **Feminino e 8 divisões de peso:** quando o jogo suportar mais categorias.
