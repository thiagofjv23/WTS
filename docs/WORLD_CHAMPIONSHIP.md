# Campeonato Mundial (World Taekwondo Championships)

Documento da mecânica do Campeonato Mundial.

## O que é

O **Campeonato Mundial** é o evento de maior prestígio do calendário depois das
Olimpíadas. Baseado no Mundial real de **2025 (Wuxi)**: eliminação simples
(melhor de 3 rounds), **1 atleta por país por categoria**, aberto às federações
do mundo todo (sem trava de ranking).

## Estrutura

| Aspecto | Valor |
|---|---|
| Quando | **julho**, bienal — anos ÍMPARES a partir de **2027** (2027, 2029, 2031, …) |
| Local | Astana, Cazaquistão |
| Formato | eliminação simples, 4 categorias |
| Vagas | **1 por país** (o melhor ranqueado de cada país), até 128 por categoria |
| Grau | **G-14** (campeão = 140 pts) — abaixo só das Olimpíadas (G-20) |
| Combate | normal (forma + rivalidade) — evento oficial, pontua no ranking |

O **grau G-14** o coloca acima de tudo (Grand Prix Final G-10, Grand Slam G-12) —
só as Olimpíadas (G-20) valem mais.

Obs.: o Mundial real tem 8 divisões de peso; a simulação usa as **4 categorias
olímpicas masculinas** (mesmo escopo do resto do jogo).

## Como funciona no pipeline

1. **Agendamento** (`scheduleWorldChampionship`): junto de cada temporada, mas só
   nos anos de Mundial (`isWorldsYear`), em `AAAA-07-18`.
2. **Vagas** (`eligibility.classifyEvent`): o grau **G-14** recebe a trava
   `nationalLimit = 1` (1 por país, sem continente, sem lock de ranking); é
   invitational (os representantes nacionais comparecem). Campo até 128 por
   categoria (melhores representantes por ranking).
3. **Torneio + consequência**: chaveamento, combate, pontos/medalhas/histórico/
   rivalidades — como qualquer evento oficial.

O campeão do Mundial é uma das **vagas válidas do Grand Slam Finals**.

## Parâmetros

Em `src/engine/worldChampionship.js`:

| Constante | Valor | Papel |
|---|---|---|
| `WORLDS_GRANK` | `"G-14"` | grau/pontos (campeão 140) |
| `WORLDS_FIELD` | 128 | máximo de inscritos por categoria (1/país) |
| `WORLDS_FIRST_YEAR` | 2027 | 1ª edição; depois de 2 em 2 anos |

## Pendente / futuro

- **8 divisões de peso e feminino:** entram quando o jogo suportar mais
  categorias (hoje só as 4 olímpicas masculinas).
- **Olimpíadas (G-20)** e a classificação olímpica são o próximo grande passo do
  ciclo (TODO).
