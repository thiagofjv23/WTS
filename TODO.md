# TODO — World Taekwondo Simulator

Controle central de itens adiados. Cada item traz o motivo do adiamento e onde
será retomado. Atualizado a cada passo do desenvolvimento.

## Legenda
- 🔴 Bloqueado / depende de outro passo
- 🟡 Adiado por decisão de escopo
- 🟢 Pronto para retomar quando desejado

---

## Adiados por decisão de escopo (validar núcleo primeiro)

- 🟡 **Categorias femininas.** Iniciamos apenas com masculino (decisão do
  usuário). Após o núcleo testado, adicionar as 4 categorias olímpicas
  femininas (-49, -57, -67, +67 kg). **O ranking oficial já traz as 4 abas
  femininas** (sheets 5–8 do .xlsx) — basta estender `SHEETS` em
  `scripts/buildRoster.mjs` e `MEN_CATEGORIES`→categorias femininas.
  → Retomar em: `src/config/weightCategories.js`, `scripts/buildRoster.mjs`.

- 🟡 **Data de nascimento real.** O ranking WT não traz idade; hoje geramos idade
  plausível (prime ~25). Buscar datas de nascimento reais (outra fonte WT/perfis)
  para carreiras/aposentadorias fiéis.

- 🟡 **Datas reais dos eventos.** O ranking traz nome/ano dos eventos, não as
  datas exatas. Hoje distribuímos os 23 eventos uniformemente pela temporada.
  Buscar o calendário oficial WT para datas fiéis (afeta ordem/pontos por época).

- 🟢 **Eventos G-8 (Mundial) e G-20 (Olimpíadas).** Não aparecem nesta janela do
  ciclo. Adicionar manualmente ao calendário nos anos corretos (e a repescagem
  olímpica das §7). Também: filtrar eventos Junior num mundo de seniores.

- 🟡 **Roster completo (cauda longa).** Usamos o TOP 256 por categoria (~1.024
  atletas) por causa do alvo mobile/localStorage. Incluir os ~3.092 atletas
  masculinos (ou permitir escolher o limite) é opção futura — ajustar
  `LIMIT_PER_CATEGORY` em `scripts/buildRoster.mjs`.

- 🟢 **Normalização de nomes reais.** O título simples erra siglas (ex.:
  "CJ NICKOLAS" → "Cj Nickolas"). Refinar regras (preservar siglas em maiúsculas,
  partículas como "de"/"van"/"al-").

- 🟢 **Mapa IOC→ISO-2.** Atletas reais usam código IOC (KOR, BRA...). Futuros
  atletas GERADOS por país precisarão mapear IOC→ISO-2 para reaproveitar os
  dicionários de nomes (`names.js`) e bandeiras.

- 🟡 **Irã (IR) e demais países sem sobrenomes.** O arquivo
  `common-surnames-by-country.json` não contém Irã e vários outros países
  presentes no seed. Seed inicial usa apenas países presentes nos DOIS arquivos
  de nomes (KR, TR, BR, CN). Definir estratégia de fallback de sobrenomes
  (ex.: usar país vizinho/idioma semelhante) antes de incluir os demais.
  → Retomar ao escalar o seed para ~2.200 atletas.

- 🟡 **Seed completo (~2.200 atletas, 80–100 países, tiers).** Começamos com um
  seed pequeno (4 países, poucos atletas) para provar o pipeline ponta a ponta.
  Escalar seguindo `seed_inicial.md` (Tier 1/2/3, distribuição histórica).
  → Retomar após o pipeline de 1 dia estar validado.

## Adiado por dependência de passos futuros

- 🔴 **Interface (UI mobile-first).** Só após o motor rodar no console
  (filosofia de crescimento em camadas dos docs). Vanilla JS + ES Modules.

- 🔴 **Systems do Simulation Director ainda não implementados:** Training,
  Recovery, Athlete AI, Federation AI, News. O núcleo inicial implementa o
  caminho crítico (Time → Calendar → Competition → Combat → Consequence →
  Ranking → Save). Os demais entram por extensão, sem alterar o núcleo.

- 🔴 **Repescagem olímpica (dois bronzes).** `taekwondo-ranking.md` §7.
  Brackets iniciais usam eliminação simples com bronze único até validarmos
  o fluxo básico. Repescagem entra ao implementar competições tipo G-20.

- 🔴 **Decaimento temporal de pontos (4 anos).** `taekwondo-ranking.md` §5.
  Ranking inicial soma pontos brutos; o decaimento por aniversário do evento
  entra quando houver múltiplas temporadas simuladas.

- 🔴 **Desempate avançado de ranking.** `taekwondo-ranking.md` §3 (mais pontos
  em eventos de maior peso → pontos no ano corrente → confronto direto). Hoje o
  desempate é por rating combativo. Requer guardar pontos por G-Rank e por ano.

- 🟢 **Fatores de premiação além do 9º lugar.** O doc §2 só especifica até 9º
  (15.12%). Para 17º+ (chaves de 32) estendemos com ×0.7 — confirmar os valores
  oficiais da World Taekwondo.

- 🔴 **Persistência real (localStorage/IndexedDB).** Storage inicial é uma
  camada abstrata com backend em memória/arquivo para testes em Node. O backend
  localStorage entra junto com a UI no navegador.

## Realismo de temporada (identificados na simulação multi-temporada)

- 🟡 **Modelo de participação dos atletas.** Hoje os top-`fieldSize` de cada
  categoria entram em TODOS os eventos → um top competindo em ~25 eventos/ano
  (irreal; o normal são ~8–12). Modelar escolha de calendário por atleta
  (viagem, foco, custo) via Athlete AI System.

- 🟡 **Regra "melhores N resultados contam".** A WT conta apenas os melhores
  resultados no ranking, não todos. Sem isso, os pontos inflam (>1000) ao longo
  das temporadas. Implementar junto com o decaimento para pontuações realistas.

- 🟡 **Calendário completo do PDF oficial.** O PDF é imagem com células mescladas
  (OCR não alinha títulos). Curamos um subconjunto Kyorugi/Senior confiável.
  **Ideal: receber o calendário como CSV/Excel** (como nomes e ranking) para
  importar TODOS os eventos com datas/títulos exatos. Também: datas aproximadas
  (`dateExact:false`) a confirmar; incluir Grand Slam/Team/World Cup (formatos
  especiais) e, nos anos certos, Mundial (G-8) e Olimpíadas (G-20).

## Melhorias técnicas pendentes

- 🟢 **Bloqueio de equipe/clube nas chaves** (`taekwondo-ranking.md` §6, último
  item). Requer entidade Club/Academia, ainda não modelada.
- 🟢 **Auditoria de aleatoriedade** (registro de randomValues por evento,
  `random_system.md`). Estrutura prevista, ativação adiada.
- 🟢 **Modo Histórico do Random System** (recriar cenários conhecidos).
- 🟢 **Calibração do combate.** A inclinação atual (gap de 10 pts ≈ 92% de
  vitória) é ajustável via constante `k` em `probability.js:advantage()`.
  Revisar após simular temporadas inteiras e observar a taxa de zebras global.
- 🟢 **Mecânicas de combate futuras** (fight_algorithm.md → Extensibilidade):
  knockout, golden point explícito, revisão por vídeo, lesões durante a luta,
  desistências, desclassificações. Entram como etapas complementares do fluxo.
- 🟢 **Pools de nomes pequenos.** Alguns países têm poucos nomes masculinos
  (CN: 9, KR: 10), gerando repetição de primeiros nomes com muitos atletas.
  Combos ainda dão centenas de nomes únicos por país, mas ao escalar o seed
  vale ampliar os dicionários de origem ou combinar nome do meio.
