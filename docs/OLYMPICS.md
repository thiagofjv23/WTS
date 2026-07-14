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
   trava as 5 vagas de ranking e congela a ordem do ranking de 3/dez (usada como
   último critério na substituição por lesão).
2. **`WT Grand Slam — {ano} Olympic Quota`** (de papel): trava a vaga do Grand
   Slam (escorregando pelo Ranking de Mérito).
3. **`{ano} {Região} Taekwondo Olympic Qualification Tournament`** (5 torneios de
   chave real): campo = atletas do continente ainda não classificados, 1/país; os
   finalistas (ou o campeão, na Oceania) ganham vaga. **Não pontuam no ranking.**
4. **`Confirmação Olímpica {ano}`** (de papel, **15 dias antes** — 15/jul): fecha
   o campo (país-sede + Comissão Tripartite → 16) e faz a **substituição por
   lesão** (abaixo). Marca o campo como fechado.
5. **`Taekwondo at the {ano} Summer Olympics`**: roda como evento oficial G-20
   (pontos, medalhas, histórico, rivalidades, lesões) com **repescagem** (abaixo).

As vagas ficam em `world.olympicQuotas[ano][categoria]` (`{ athleteId, method,
countryCode }`), consultadas pela tela da competição (badge de como cada atleta
se classificou).

## Repescagem (dois bronzes)

O torneio principal é mata-mata de 16. Quando as duas semifinais terminam e os
dois finalistas estão definidos, resgatam-se todos os atletas derrotados por
esses dois finalistas no dia (oitavas, quartas e semifinal):

- **1ª rodada** (por lado do finalista): quem perdeu nas **oitavas** enfrenta quem
  perdeu nas **quartas** para aquele mesmo finalista.
- Os **semifinalistas** folgam e vão direto à luta de bronze.
- **Bronze cruzado**: o sobrevivente de um lado enfrenta o semifinalista do lado
  **oposto** (evita reencontro de quem veio da mesma chave). Os **dois vencedores**
  ganham bronze.

Colocações finais: **1** (ouro), **2** (prata), **3** (dois bronzes), **5** (os
que caíram na repescagem/quartas sem medalha) e **9** (oitavas não resgatadas).
Só na chave cheia de 16 sem byes; fora disso, cai no padrão de dois bronzes por
semifinalistas.

## Substituição por lesão (15 dias antes)

Na **Confirmação Olímpica** (15 dias antes dos Jogos), cada classificado é
verificado:

- Se está lesionado e a lesão **termina depois** do prazo (não se recupera a
  tempo), ele **perde a vaga** — gera notícia. (Se a lesão termina até o prazo,
  segue no torneio.)
- A vaga é herdada, nesta ordem:
  1. **Seleção Nacional** daquele país/categoria — campeão da seletiva, depois
     vice, depois reservas — o primeiro que for **Top-20** do ranking (ativo e não
     classificado);
  2. senão, o **melhor do ranking de 3/dez do ano anterior** que não se
     classificou e cujo país **não** tem atleta classificado na categoria.
- O substituto gera notícia (por Seleção Nacional ou por ranking).

Como a verificação precisa da Seleção Nacional definida (seletivas de janeiro) e
das vagas fechadas, ela roda depois de tudo, na Confirmação. Lesões após a
Confirmação (últimos 15 dias) não têm substituição — o atleta apenas não entra na
chave.

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
