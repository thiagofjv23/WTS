# DECISIONS — Registro de Decisões de Projeto

Registro das decisões de implementação tomadas durante o desenvolvimento, para
que possam ser revisadas e aprimoradas depois. Cada decisão traz o contexto, a
escolha feita e a justificativa. Nenhuma decisão contraria os documentos de
arquitetura; onde os docs deixaram espaço em aberto, a escolha está aqui.

Formato: `[Data] Área — Decisão`

---

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
