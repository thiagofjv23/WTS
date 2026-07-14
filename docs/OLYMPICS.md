# Jogos Olímpicos e Classificação Olímpica

O maior torneio do ecossistema. Fonte: `Jogos Olímpicos.md` e
`Esquema de classificação para as Olimpíadas.md`.

## O que é

A cada **4 anos** (2028, 2032, 2036…), **16 atletas por categoria** (1 por país)
disputam os Jogos em eliminação simples. É um evento oficial **G-20** (campeão =
200 pts) — pontua no ranking mundial normal. Escopo atual: **4 categorias
masculinas** (o feminino entra quando o jogo o suportar).

Toda a lógica é **config-driven** (`src/config/olympics.js`): categorias, vagas,
limites, ordem dos critérios, datas e sedes ficam na configuração do ciclo —
nunca fixos na lógica (diretriz "Sem Hardcoded").

## Sedes

Lista fixa (English names) em `OLYMPIC_HOSTS`: 2028 Los Angeles (USA), 2032
Brisbane (AUS), 2036 Munich (GER), 2040 Nusantara (INA), … 2100 Athens (GRE).
Sedes cujo país não está no roster simplesmente não recebem a vaga de país-sede
(a Comissão Tripartite completa). **TODO:** trocar a lista por **sorteio** de
sedes (ver TODO.md).

## Classificação (ordem rígida)

Assim que um atleta garante vaga, ele é **removido de todas as etapas seguintes**
(e o limite de 1/país por categoria vale o processo inteiro). Para fechar **16**
por categoria:

| Etapa | Quando | Vagas |
|---|---|---|
| **1. Ranking Olímpico** | 3/dez do **ano anterior** | **5** (top 5 do ranking mundial, países distintos) |
| **2a. Grand Slam** | 17/dez do **ano anterior** | **1** (líder do Ranking de Mérito; escorrega se já classificado) |
| **2b. Continentais** | fev–abr do **ano olímpico** | **9** (África/Ásia/Europa/Pan-Am = 2 finalistas; Oceania = 1 campeão) |
| **3. País-sede** | nos Jogos | **2** (melhores atletas da sede em categorias sem atleta da sede) |
| **4. Comissão Tripartite** | nos Jogos | completa até 16 |

Total por categoria: **5 + 1 + 9 + 1 = 16** (a sede ocupa 2 categorias; a
Tripartite completa as demais).

### Etapa 4 — Comissão Tripartite

Até completar 16, no máximo **1 de cada** tipo, nesta ordem:
1. melhor ranqueado ainda não classificado (país sem vaga na categoria);
2. melhor ranqueado do **continente-sede**;
3. melhor ranqueado de um **país aleatório** abaixo da **posição 20** do ranking
   de países (sorteio determinístico).

## Datas (mês/dia dos docs; ano por regra)

- **Ranking** (3/dez) e **Grand Slam** (17/dez): **ano anterior**.
- **Continentais** (ano olímpico): African 10/fev, European 9/mar, Asian 15/mar,
  Oceania 6/abr, Pan American 9/abr — nomes reais em inglês.
- **Jogos**: **30/jul** do ano olímpico.

Obs.: o Grand Slam mantém sua data própria (12/dez); a vaga olímpica lê o Ranking
de Mérito já publicado.

## Como funciona no pipeline

O calendário continua sendo a fonte da verdade — cada etapa é um evento agendado:

1. **`WT Olympic Ranking — {ano} Qualification`** (evento "de papel", sem lutas):
   trava as 5 vagas de ranking.
2. **`WT Grand Slam — {ano} Olympic Quota`** (de papel): trava a vaga do Grand
   Slam (escorregando pelo Ranking de Mérito).
3. **`{ano} {Região} Taekwondo Olympic Qualification Tournament`** (5 torneios de
   chave real): campo = atletas do continente ainda não classificados, 1/país; os
   finalistas (ou o campeão, na Oceania) ganham vaga. **Não pontuam no ranking.**
4. **`Taekwondo at the {ano} Summer Olympics`**: antes de montar as chaves, o
   Director fecha o campo (país-sede + Tripartite); depois roda como evento
   oficial G-20 (pontos, medalhas, histórico, rivalidades, lesões).

As vagas ficam em `world.olympicQuotas[ano][categoria]` (`{ athleteId, method,
countryCode }`), consultadas pela tela da competição (badge de como cada atleta
se classificou).

## Parâmetros (`src/config/olympics.js`)

| Constante | Papel |
|---|---|
| `OLYMPIC_FIRST_YEAR` / `OLYMPIC_CYCLE_YEARS` | 2028, a cada 4 anos |
| `OLYMPIC_HOSTS` | sedes por ano (cidade + IOC) |
| `getOlympicConfig(year)` | config do ciclo (base Paris 2024 + sobrescritas) |
| `OLYMPIC_OVERRIDES` | ajustes por edição (hoje vazio) |

## Pendente / futuro

- **Sorteio de sedes** (hoje lista fixa).
- **Feminino e 8 categorias** quando o jogo suportar.
- **Repescagem olímpica** (dois bronzes por chaves separadas) — hoje usa o padrão
  de dois semifinalistas com bronze (TODO geral do sistema de chaves).
- **Substituição de lesionados** entre a classificação e os Jogos (hoje um
  classificado lesionado no dia simplesmente não entra na chave).
