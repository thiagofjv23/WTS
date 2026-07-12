# DECISIONS — Registro de Decisões de Projeto

Registro das decisões de implementação tomadas durante o desenvolvimento, para
que possam ser revisadas e aprimoradas depois. Cada decisão traz o contexto, a
escolha feita e a justificativa. Nenhuma decisão contraria os documentos de
arquitetura; onde os docs deixaram espaço em aberto, a escolha está aqui.

Formato: `[Data] Área — Decisão`

---

## [2026-07-12] Wildcards — President's Cup → vaga extra no Continental
Contexto/pedido: a President's Cup dá ao vencedor uma vaga direta para o
Continental; o Continental leva 1 por país, então o wildcard é a única forma de um
país ter DOIS atletas. As President's Cups ficam fechadas ao continente (já era
assim no código — `eligibility.js` — o que também simplifica para o observador).

Decisão:
- **`src/engine/wildcards.js`** (novo): concede (`grantPresidentsCupWildcards`),
  resolve (`wildcardEntrantsFor`) e consome (`consumeWildcards`) as vagas.
- **Agraciado:** campeão da Copa; se ele já é o nº 1 do país (já entra como
  representante nacional), passa ao vice, depois ao 3º **que perdeu para o
  campeão**, e assim por diante até achar quem não seja o nº 1 do seu país. O
  desempate de mesma colocação (dois bronzes) usa "quem perdeu para o mais bem
  colocado vem antes" — honra o "perdeu para o campeão" e generaliza.
- **"nº 1 do país" avaliado no continental** (ranking mensal vigente), pois é o
  que define o representante nacional daquele evento.
- **Ciclo:** no calendário real a Copa vem depois do continental do mesmo ano,
  então a vaga vale para o continental do ANO SEGUINTE. Guardada em
  `world.wildcards` (só a ordem de ids), consumida/expirada em ~1 ano (não
  acumula). O agraciado do evento fica em `competition.wildcards[categoria]`.
- **Pipeline:** grant na consequência da Copa; resolução antes de montar o campo
  do continental (entra ALÉM do 1 por país, via `selectParticipants`); consumo na
  consequência do continental.
- **UI:** selo **WC** (verde) ao lado do nome no campo projetado e na
  classificação final do continental.

Verificado: President's Cups de 2026 concedem; continentais de 2027 mostram o
agraciado dando ao país um 2º atleta (ex.: AUS com representante + wildcard no
Oceania), com os demais países em 1; determinístico; selo renderiza; sem erros.
Documento: `docs/WILDCARDS.md`.

## [2026-07-12] Persistência — Backend IndexedDB (síncrono por fora, assíncrono por dentro)
Contexto: com o roster completo o save passa dos ~5 MB do localStorage já na 1ª
temporada. Decisão do usuário: migrar para IndexedDB agora; a RETENÇÃO fica como
próximo passo (o IndexedDB remove o teto de disco, mas RAM/serialização/décadas
ainda pedem retenção — ver TODO).

Problema de projeto: o IndexedDB é ASSÍNCRONO, mas todo o motor é SÍNCRONO (o
Save System grava no meio do pipeline diário). Reescrever para async violaria
"extensão, não reescrita".

Decisão (3 peças, todas sem dependências):
1. **`IndexedDBBackend`** (`src/services/idb.js`): mantém a MESMA interface
   síncrona (`get/set/remove/keys`) sobre um cache em memória hidratado do IDB em
   `init()` (chamado uma vez no boot, com await). As gravações vão ao IDB em
   SEGUNDO PLANO; se falharem, avisa e a simulação segue em memória. O motor não
   muda nada.
2. **Modo adiado no `StorageService`** (`deferMs`): as gravações de um burst (o
   save de cada dia num "próximo evento") são AGRUPADAS e serializadas UMA vez no
   `flush` (debounce). Elimina o `JSON.stringify` do mundo por dia — o pior
   "próximo evento" caiu de ~675 ms para ~45 ms com o roster cheio. `flush()` é
   chamado ao ocultar/sair da página.
3. **Boot assíncrono + fallback** (`src/main.js`): IndexedDB → localStorage →
   memória. Migra uma vez o save antigo do localStorage para o IDB (não perde
   progresso de quem já jogava).

Verificado no navegador: novo jogo grava só no IndexedDB (não no localStorage);
reload oferece "Continuar" e retoma na mesma data; 80 eventos (> 1 temporada,
7,55 MB) sem estourar cota nem erros — onde o localStorage quebrava perto de 5 MB.

## [2026-07-12] Roster — Incluir TODOS os rankeados + UI virtualizada
Contexto: antes limitávamos a TOP 256/categoria (1.024 atletas) por causa do
save/mobile. Pedido do usuário: incluir a database inteira do ranking (todos os
atletas rankeados), já que o custo de CRIAR a database é baixo, ajustando a UI
para a performance não sofrer. As Diretrizes Técnicas preveem explicitamente
"simulação eficiente mesmo com milhares de atletas".

Decisão:
1. **Roster completo:** `LIMIT_PER_CATEGORY = Infinity` em `buildRoster.mjs`.
   O roster passou de 1.024 → **3.092 atletas** (M-58:992, M-68:1028, M-80:659,
   M+80:413), 176 países. Arquivo gerado: ~283 KB (build-time; ~81 ms). Identidade
   e pontos reais; idade/atributos seguem gerados.
2. **UI — lista virtualizada** (`src/ui/virtualList.js`): o ranking pode ter ~1.000
   linhas por categoria. Renderizamos só a janela visível (~24 linhas no DOM) sobre
   um espaçador com a altura total; recalcula na rolagem (via rAF), referência no
   viewport (a interface rola a janela do documento, não um container). Passo de
   linha fixo (72 px = 64 + 8) no CSS. Sem dependências.
3. **Perf de leitura** (`gameController._fieldCache`): o campo projetado por
   (competição|categoria) é memoizado e invalidado a cada avanço de tempo (o
   ranking é mensal, então entre avanços o campo é estável). Abrir a 1ª ficha de
   uma categoria custa ~70 ms (frio); as seguintes ~0,4 ms. `getRanking` da
   categoria inteira: ~1 ms.
4. **Save não fatal** (`StorageService.save`): com o roster completo o save inicial
   é ~3,1 MB e passa de ~5 MB (limite do localStorage) já na 1ª temporada. O save
   passou a NÃO propagar erro (ex.: QuotaExceededError): a simulação segue viva em
   memória e emite `WorldSaveFailed`. É paliativo — a solução real é retenção +
   IndexedDB (TODO, prioritário; agora mais urgente).

Combate e agenda NÃO ficam mais lentos (o nº de lutas depende do fieldSize, não do
tamanho do plantel): 1 temporada completa roda em ~1,3 s com o roster inteiro.

## [2026-07-09] Escopo — Iniciar apenas com categorias masculinas

## [2026-07-09] Escopo — Iniciar apenas com categorias masculinas
Decisão do usuário. O núcleo (combate, chaves, ranking, pipeline) será validado
só com masculino; feminino entra depois por extensão (ver TODO.md). Não há
impacto arquitetural: gênero já é um campo de primeira classe nas entidades.

## [2026-07-09] Nomes — Pré-processar arquivos de nomes em tempo de build
Contexto: `common-forenames-by-country.json` (523 KB) e
`common-surnames-by-country.json` (389 KB) são grandes e trazem dados que não
usamos no núcleo (gênero feminino, grafia localizada, notas, ranks, regiões).

Decisão: um script de build (`scripts/buildNames.mjs`) lê esses arquivos UMA vez
e gera um `src/database/names.js` compacto contendo, por país, apenas arrays de
strings romanizadas de nomes masculinos e sobrenomes. O engine consome só esse
arquivo pequeno em runtime.

Justificativa: atende ao pedido do usuário de "consumir menos processamento,
tanto na build quanto nas engines". O custo de parsear ~900 KB ocorre só na
build; em runtime o jogo carrega um dicionário mínimo e faz apenas um sorteio
indexado (O(1)) por nome. Usamos `romanized` (não `localized`) para evitar
problemas de fontes/encoding na UI inicial e reduzir tamanho.

## [2026-07-09] Nomes — Seed usa só países presentes nos DOIS arquivos
KR, TR, BR, CN estão tanto em forenames quanto em surnames. Irã (Tier 1 no seed)
não tem sobrenomes no arquivo, então fica adiado (TODO.md) até definirmos
fallback. Evita gerar atletas sem sobrenome ou com sobrenome inventado.

## [2026-07-09] Random — PRNG Mulberry32 com seed de 32 bits
Contexto: `random_system.md` exige aleatoriedade determinística, reproduzível e
auditável, proibindo `Math.random()` direto.

Decisão: implementar `RandomSystem` sobre o algoritmo Mulberry32 (gerador de 32
bits, rápido, sem dependências, estado serializável em um único inteiro).
Oferece: `next` (uniforme 0–1), `int`, `chance`, `pick`, `weighted`,
`gaussian`. O estado (`_state`) é serializável, permitindo salvar/retomar a
sequência exatamente no ponto em que estava.

Justificativa: Mulberry32 é minúsculo, veloz e determinístico — ideal para
milhares de lutas por temporada em dispositivos móveis. Estado inteiro único
simplifica o salvamento exigido pelo Save System.

## [2026-07-09] Event Bus — Síncrono e determinístico
Contexto: `world_event_bus.md` exige ordem determinística e sem duplicidade.

Decisão: Event Bus síncrono. `publish` entrega o evento a cada listener na ordem
de inscrição, imediatamente. Eventos "assíncronos" (notícias, UI) são apenas
listeners de baixa prioridade — não usamos filas/microtasks no núcleo para
preservar o determinismo com a mesma seed.

Justificativa: assincronia real (Promises) quebraria a reprodutibilidade
exigida pelo Random System. Mantemos tudo síncrono no motor; a UI pode reagir de
forma assíncrona por fora, sem afetar a simulação.

## [2026-07-09] Storage — Camada abstrata com backend plugável
Contexto: docs pedem localStorage agora e IndexedDB depois sem reescrever o
motor.

Decisão: `StorageService` recebe um backend (interface get/set/remove). No
núcleo/testes usamos um backend em memória; no navegador injetamos um backend
localStorage; futuramente IndexedDB. O motor nunca fala com localStorage direto.

## [2026-07-09] Ranking — Tabela de premiação explícita (não geométrica)
Contexto: `taekwondo-ranking.md` §2 dá 1º=100%, 2º=60%, 3º=36%, 5º=21.6%,
9º=15.12%. A progressão NÃO é ×0.6 constante (o passo 5º→9º é ×0.7).

Decisão: usar a tabela explícita do documento (`PLACEMENT_FACTORS`) em vez de
uma fórmula 0.6^n. Para colocações além do 9º (17º+, que surgem em chaves de 32),
estendemos multiplicando por 0.7 — SUPOSIÇÃO a confirmar, pois o documento não
especifica esses degraus. Decaimento de 4 anos (§5) e desempate avançado (§3)
seguem adiados.

## [2026-07-09] Seed — Base de atletas REAIS (híbrido) a partir do ranking oficial
Contexto: usuário forneceu `12. Olympic_Kyorugi_Rankings_June_2026.xlsx` com o
ranking oficial WT (8 abas = 8 categorias olímpicas; 4 masculinas no escopo).
Colunas: Rank, Member Name, Member Number (traz código IOC), Country, pontos por
evento e Total Points. Sem idade.

Decisão (híbrido): identidade REAL (nome, país, categoria) + pontos REAIS de
ranking do arquivo; idade e atributos GERADOS. Atributos ancorados na posição do
ranking (favoritos reais nascem fortes no sim). Idade gerada (prime ~25) — data
de nascimento real fica como melhoria (TODO). O nameGenerator deixa de ser usado
para atletas do seed (só servirá a futuros atletas gerados).

## [2026-07-09] Seed — Cap de atletas por categoria (mobile/localStorage)
**SUPERSEDIDA em 2026-07-12** (ver entrada no topo: roster completo + UI
virtualizada). Mantida para histórico do raciocínio.

Contexto: o arquivo traz ~3.092 atletas masculinos (M-58:992, M-68:1028,
M-80:659, M+80:413), com uma cauda longa de pontuadores mínimos (<1 pt).

Decisão: no build do roster, limitar aos TOP N por categoria (padrão N=256,
configurável), ~1.024 atletas — alinhado ao volume do seed_inicial.md e
mantendo saves pequenos para o alvo mobile. A cauda longa (entrantes ocasionais)
fica de fora do mundo jogável; incluir tudo é opção futura (TODO).

## [2026-07-09] XLSX — Parser próprio sem dependências (build-time)
Decisão: `scripts/buildRoster.mjs` descompacta o .xlsx (zip de XML) via parser
regex próprio (sharedStrings + células), mapeia colunas por CABEÇALHO (não por
letra, pois a posição varia entre abas) e gera `src/database/realRoster.js`
compacto. O .xlsx (326 KB) nunca é lido em runtime — mesmo princípio dos nomes.

## [2026-07-09] G-Rank — Fórmula geral n×10 (calendário real tem G-6/G-10)
O calendário oficial 2026 usa graus além do taekwondo-ranking.md (G-6 Grand Prix
Series, G-10 Grand Prix Final, G-8 equipes). A regra WT é campeão = n×10 pontos,
consistente com o doc (G-1=10 … G-20=200). Passamos a calcular pontos por
`championPointsFor("G-n") = n×10`, aceitando qualquer G-n.

## [2026-07-09] Ranking — Decaimento de 4 anos via LEDGER de resultados
Contexto: §5 exige decaimento (100/75/50/25/0% por ano). Antes somávamos pontos
brutos num total.

Decisão: cada atleta tem `pointsLedger` (lista de {date, points, gRank}). Os
pontos efetivos são recalculados a cada atualização de ranking aplicando o fator
de decaimento sobre a idade de cada resultado. Determinístico e fiel ao §5.
Os pontos reais do seed entram como uma entrada de ledger datada no início do
mundo (2026-07-01) — logo, decaem ao longo das temporadas seguintes
(aproximação: na realidade foram ganhos ao longo dos 4 anos anteriores).

## [2026-07-09] Temporadas — Primeira temporada simulada = 2027
O ranking-semente é a foto de junho/2026. As temporadas simuladas começam em
2027 (yearOffset=1), repetindo a estrutura anual do calendário 2026 com o ano
deslocado. A temporada parcial de 2026 (já ocorrida na realidade) é pulada.

## [2026-07-09] Calendário 2026 — Curado do PDF oficial (imagem/OCR)
O PDF do calendário é baseado em IMAGEM com células mescladas, então o OCR lê
datas/graus por linha mas NÃO alinha os títulos de forma confiável. Por isso o
`calendar2026.js` é curado: eventos Kyorugi/Senior com G-Rank do ranking
(autoritativo) + os grandes eventos de 2026 (Grand Prix Series/Final) lidos do
calendário. Datas marcadas `dateExact:true` foram lidas com confiança; as demais
são aproximadas. Poomsae/Virtual/Junior/Cadet/Team/Grand Slam ficam fora.

## [2026-07-09] Calendário — Importado do texto oficial (2026 Events.txt)
O usuário forneceu o calendário em texto (resolvendo o problema do PDF-imagem).
`scripts/buildCalendar.mjs` reconstrói a associação título↔linhas (células
mescladas: o título vem nas linhas após uma linha de evento terminada em TAB) e
gera `calendar2026.js` com 67 eventos Kyorugi/Senior reais (data, G-Rank, nome,
local). Exclui Poomsae, Virtual, Junior, Cadet, Team, Grand Slam (formato
especial) e eventos exclusivamente femininos (mundo masculino no escopo).

## [2026-07-09] Ranking — Regra "melhores N resultados contam" (best-N)
Contexto: a WT considera apenas os melhores resultados no ranking, não todos —
sem isso os pontos inflam ao longo das temporadas.

Decisão: `effectivePoints` passa a somar apenas as N MAIORES entradas do ledger
(já com decaimento aplicado), não todas. `BEST_N` configurável (padrão 5),
calibrado para gerar totais realistas de topo (~200–350 pts). Combina com o
decaimento §5 (cada entrada decai; depois pegamos as N melhores).

## [2026-07-09] Participação — Escolha de torneios por atleta (Athlete AI)
Contexto: antes, os top-32 de cada categoria entravam em TODOS os eventos
(irreal). Baseado na sugestão #1 (e #4) do documento de diretrizes.

Decisão: `participation.js` decide, por atleta e por evento, a probabilidade de
inscrição:
 - Atração por grau: atletas mais fortes (percentil de ranking alto) têm baixa
   probabilidade de entrar em eventos de grau baixo (G-1) e alta nos grandes
   (G-4/G-6/G-10). Atletas de base entram em muitos G-1/G-2 para "farmar".
   Fórmula: attract = (gradeValue/100)^(percentil×2).
 - Fadiga (sugestão #4): competições recentes (janela de 28 dias, lidas do
   history) reduzem a probabilidade — evita entrar em muitos eventos seguidos.
 - Campo final: quem decidiu entrar, limitado a fieldSize por ranking, com um
   mínimo (minField) para garantir chaves válidas.
Assim os favoritos concentram-se nos grandes eventos e os menores são vencidos
por atletas de nível médio — espalhando os pontos de forma realista. Sugestões
#2 (viagens), #3 (pico de forma) e #5 (lesões/rotatividade) ficam para depois
(TODO), integráveis por extensão sem alterar este núcleo.

## [2026-07-10] Forma dinâmica (#3), Lesões e Recuperação (#5)
Objetivo: aproximar os totais de ranking do real espalhando as vitórias dos
grandes eventos — com zebras EXPLICÁVEIS (forma/lesão), não ruído puro.

**Form System** (`engine/form.js`): a forma do atleta oscila por evento. Elite
(top 32) periodiza — pico nos eventos grandes (G-4+), "desligado" nos pequenos
(G-1/G-2/G-3); todos têm variação aleatória por evento ("forma do dia"). A forma
vira um multiplicador temporário sobre os atributos SÓ para aquele combate
(combat_framework: estados não alteram atributos permanentes). O Combat Engine
recebe atributos efetivos do dia; não conhece o conceito de forma.

**Injury System** (`engine/injuries.js`): desgaste cumulativo (`condition.wear`)
sobe com a carga de lutas e recupera com o tempo (lazy). Após cada competição,
cada participante rola risco de lesão em função da carga, do desgaste acumulado
e da durabilidade (resistência/recuperação). Lesão → status "lesionado" +
`injuredUntil` (semanas a meses por severidade) + evento `AthleteInjured`.

**Recovery System** (`engine/recovery.js`): roda todo dia (pipeline §4);
reativa quem cumpriu o período de recuperação (`AthleteRecovered`). Atletas
lesionados são automaticamente excluídos dos campos (participation usa só
"ativo") e permanecem no ranking com pontos decaindo — o que rotaciona campeões.

Ambos usam o RandomSystem (deterministas) e o World Event Bus. Substituem a ideia
de achatar o `k` do combate por um mecanismo com causa (forma/lesão), mais fiel
ao "mundo vivo". Parâmetros calibrados por medição (ver TODO).

## [2026-07-10] Estrutura competitiva — Teto de pontos, travas e locks de ranking
Fonte: "Estrutura Competitiva e Dinâmica de Ranking do Taekwondo Mundial". Regras
concretas implementadas na LÓGICA (UI fica para depois — TODO):

1. **Teto de pontos (Point Cap).** Eventos G-1 e G-2 somam no máximo **40 pontos
   por ano** ao ranking (por atleta/categoria). G-3+ são ilimitados. Substitui a
   antiga regra "best-N" (que era uma aproximação); o teto é o mecanismo REAL da
   WT e evita o "farm" infinito de Opens. Implementado em `ranking.js`
   (`effectivePoints`): agrupa os resultados G-1/G-2 por ano, conta os melhores
   até 40 (nominal) e aplica o decaimento à parcela contada; G-3+ e o seed
   entram sem teto.

2. **Travas de elegibilidade** (`eligibility.js` + `continents.js`):
   - **Grand Prix Series (G-6): só top 32** do ranking da categoria; **Grand Prix
     Final (G-10): só top 16**. Trava dura (convite por ranking), não
     probabilística.
   - **Campeonatos continentais (G-4)**: só atletas do continente do evento
     (Europeu, Asiático, Pan-Americano, Africano, Oceania) + **limite nacional**
     (1 atleta/país/categoria — o melhor ranqueado).
   - **President's Cup (G-3)**: restrito ao continente indicado no nome.
   - **Arab Cup / eventos "Arab"**: só países árabes (Liga Árabe).
   - **Jogos continentais** claramente nomeados (Asian/South American Games)
     recebem a mesma restrição de continente.

3. **Dados novos:** `continents.js` mapeia os 176 códigos IOC do roster para 5
   uniões continentais da WT (Europa, Ásia, Pan-América, África, Oceania) +
   conjunto de países árabes. Códigos sem mapeamento (ex.: Time de Refugiados)
   não entram em eventos restritos por continente.

Integração: `participation.selectParticipants` aplica primeiro as travas duras
(continente/árabe/ranking-lock), depois o limite nacional, depois a vontade de
inscrição (probabilística, com fadiga). Eventos com ranking-lock são convite:
os elegíveis entram sem sorteio de vontade.

Adiado (TODO): Mundial G-14 (bienal, limite nacional, sem lock), Olimpíadas G-20
(classificação: top 5 do ranking + Grand Slam + qualificatórios continentais),
periodização/pico de forma (#3) e lesões/rotatividade (#5).

## [2026-07-11] Ranking — Cadência mensal (materialização no dia 1)
Contexto/pedido do usuário: o ranking oficial da WT é publicado mensalmente, não
a cada evento. Antes, `recomputeRankings` rodava após CADA competição, então as
posições/pontos visíveis mudavam o tempo todo.

Decisão: o **ledger** (`athlete.pointsLedger`) continua sendo creditado a cada
competição (registro permanente e fonte da verdade), mas o ranking MATERIALIZADO
(`athlete.ranking.points/position` e `world.rankings`) só é recalculado no **dia
1 de cada mês** (`SimulationDirector._monthlyRankingUpdate`, disparado quando
`date` termina em `-01`). O **decaimento (§5)** é avaliado nessa data: um
resultado troca de faixa assim que o ranking do 1º do mês seguinte ao aniversário
é calculado (ex.: um evento de março/2026 cai para 75% no ranking de abril/2027 —
em março/2027 ele perdeu força, e o ranking de abril é o que mostra isso).

Consequências e por que é coerente:
- **Realismo:** casa com o ciclo mensal real da WT; as travas de participação
  (Grand Prix top-32 etc.) passam a usar o ranking mensal vigente, como na vida
  real, não um ranking que muda a cada luta.
- **Performance:** ~12 recálculos/ano em vez de ~67 (um por evento) — mais barato.
- **Manutenção:** um único ponto de recálculo (o dia 1), fácil de raciocinar.
- **`aRank`/`bRank`** das lutas passam a ser o ranking oficial vigente no início
  do campeonato (o mensal), o que é ainda mais fiel ao chaveamento.
- **Setas de movimento (UI):** os deltas passam a refletir a variação de um
  ranking mensal para o outro (dentro do mês não há movimento — correto).
- Estatísticas nacionais de pontos (`rankingPoints`) também se atualizam no dia 1;
  as medalhas seguem sendo contabilizadas na hora (contadores cumulativos).

## [2026-07-10] UI — Ranking de início do campeonato nos confrontos
As lutas persistidas (`competition.matches`) guardam `aRank`/`bRank` capturados
NO MOMENTO em que são gravadas — antes de `recomputeRankings` deste evento — ou
seja, a posição no ranking no INÍCIO do campeonato. A UI mostra `#N` ao lado do
nome nas lutas, dando a ideia do chaveamento.

## [2026-07-10] UI — Feed de notícias no motor (News System)
`world.news` (limitado a 400 entradas) recebe lesões e recuperações; o feed da UI
(`getNews`) mescla isso com os campeões do histórico, ordenado por data. Mantém a
UI sem lógica e respeita o limite de save (poda no TODO).

## [2026-07-10] UI — Ranking exibe todos os atletas
`getRanking` sem `limit` retorna o plantel inteiro (256/categoria). Suficiente
para o alvo atual; virtualização da lista fica no TODO caso o volume cresça.

## [2026-07-10] Mundo — Início em 01/01/2026 e 1ª temporada = 2026
Decisão do usuário: iniciar o mundo em 01/01/2026 (antes 01/07/2026) para
alinhar com o ano-calendário completo. Assim a 1ª temporada simulada é 2026
(offset 0) e TODOS os ~67 eventos do ano ficam à frente, visíveis logo no início
(a tela bate com o calendário oficial).

Aproximação assumida: o ranking-semente é a foto de JUNHO/2026, mas passa a ser
usado como estado inicial de JANEIRO/2026 (baseline de força/pontos no começo do
ano). Ou seja, a temporada 2026 é (re)simulada a partir dessas standings. É uma
simplificação consciente para viabilizar o ano-calendário completo; os pontos-
semente entram no ledger datados em 01/01/2026 e decaem normalmente. Confirmar/
refinar quando houver uma foto de ranking do início do ciclo.

## [2026-07-10] UI — Calendário mostra o ano inteiro
`GameController.getSeasonSchedule(ano)` retorna todos os eventos do ano
(realizados e a disputar). A tela agrupa por mês, com status e navegação entre
anos, atendendo ao requisito de ver todos os campeonatos do ano desde o início.
O agendamento de temporada continua automático: ao virar o ano, a próxima
temporada é agendada e passa a aparecer.

## [2026-07-09] Pipeline — Salvar após avançar a data (reordenação justificada)
Contexto: SimulationPipeline lista Save (etapa 12) antes de Avançar a data
(etapa 13). Salvar antes gera um snapshot com a data ainda "no dia jogado".

Decisão: no Simulation Director, avançamos data/contadores e depois salvamos, de
modo que o snapshot persistido represente o estado completo do dia e a simulação
retome limpa no dia seguinte (eventos do dia já marcados como processados). Os
documentos permitem reordenação "com justificativa técnica documentada" — é o caso.

## [2026-07-09] Combate — Modelo probabilístico por trocas (a calibrar)
Contexto: os docs de combate definem o FLUXO, não a matemática. Fica a nosso
critério traduzir atributo→probabilidade.

Decisão (provisória, a calibrar): cada troca resolve iniciativa, ataque, defesa
e contra-ataque via funções logísticas sobre diferenças de atributos, moduladas
por energia/momentum/forma. Detalhes registrados no passo do combate. Marcado
como ponto de calibração — números serão ajustados após rodar milhares de lutas.

Curva observada no Passo 5 (nível uniforme, 1000 lutas por par):
- gap 0 (70×70): ~49% — equilíbrio correto.
- gap 4 (72×68): ~73%.
- gap 10 (75×65): ~92%.
- gap 24 (82×58): ~99.8%.
Coerente com athlete_attributes.md (diferença entre elite é pequena; a maioria
dos confrontos intra-categoria fica em gaps < 12). A inclinação é ajustável pela
constante `k` de `advantage()` em probability.js caso queiramos mais zebras.
