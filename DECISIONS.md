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
