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

## Realismo de temporada

- ✅ **Modelo de participação dos atletas** — feito (participation.js): atletas
  escolhem eventos por grau/ranking + fadiga. Sugestão #1 e #4 do documento de
  diretrizes.
- ✅ **Teto de pontos G-1/G-2 (40/ano)** — feito (ranking.js). Substituiu o
  best-N (aproximação) pelo mecanismo real da WT.
- ✅ **Travas de elegibilidade** — feito (eligibility.js + continents.js): lock
  de ranking do Grand Prix (top 32 / top 16), campeonatos continentais
  (continente + 1 por país), President's Cup por continente, Arab Cup.
- ✅ **Calendário completo** — importado de "2026 Events.txt" (67 eventos reais).

## Estrutura competitiva — pendências de LÓGICA

- 🟡 **Impedir dupla participação no mesmo dia.** Hoje um atleta pode ser
  sorteado para dois campeonatos que ocorrem na mesma data (ex.: dois eventos no
  mesmo dia do calendário). O Participation/Competition System deve garantir que
  cada atleta entre em no máximo UM campeonato por dia (marcar quem já foi
  inscrito naquele dia antes de montar o campo do evento seguinte). Afeta
  também o campo projetado exibido na UI.


- 🟡 **Campeonato Mundial (G-14, bienal)** e **Olimpíadas (G-20)** com a
  classificação olímpica (top 5 do ranking + Grand Slam + qualificatórios
  continentais). Ainda não há evento G-14/G-20 no calendário 2026; adicionar nos
  anos certos junto com a repescagem (§7).
- 🟡 **Grand Slam** (formato especial, invitational) — porta de entrada olímpica.
- 🟢 **Calibração dos totais de pontos.** Com teto+travas os líderes ficam em
  ~450–600 pts (antes >1000); ainda acima do real (~250–350) por causa da
  dominância do favorito no combate (inclinação `k` em probability.js). Rever
  junto da calibração do combate.
- 🟢 **Jogos regionais restritos** (Mediterranean/Balkan/Central American Games)
  — hoje sem trava; classificar continente/sub-região se desejado.

## Estrutura competitiva — implicações na UI (fazer depois, conforme pedido)

- 🟢 **Mostrar as travas de cada evento** no calendário/ficha do evento:
  "Grand Prix — top 32", "Continental — só Europa", "Arab Cup", limite nacional.
- 🟢 **Continente/nacionalidade** na ficha do atleta e do país.
- 🟢 **Status do teto anual** do atleta (ex.: "G1/G2: 40/40 usados em 2027").
- 🟢 **Elegibilidade do atleta**: para quais próximos eventos ele pode/entrará.
- 🟢 **Lista de convidados do Grand Prix** (top 32/16) por categoria.

- 🟢 **Calibração de BEST_N e da participação.** BEST_N=5 e os parâmetros de
  `participation.js` (exponente de grau, fadiga) foram calibrados por olho para
  totais realistas (~200–400). Revisar contra dados reais da WT.

- ✅ **#3 Periodização/pico de forma** — feito (`engine/form.js`).
- ✅ **#5 Lesões e recuperação** — feito (`engine/injuries.js` + `recovery.js`).
- 🟡 **#2 Tours/viagens geográficas** — ainda não: maior probabilidade de
  competir em país vizinho na sequência (orçamento/energia de viagem).

## Próxima grande alavanca de realismo — Ciclo de vida do atleta

- 🟡 **Envelhecimento, declínio e aposentadoria + geração de jovens.** Hoje os
  atributos são estáticos e ninguém se aposenta. Modelar: evolução até o pico
  (~24–27), declínio, aposentadoria por idade/queda, e **geração de novos
  atletas** para repor (o nameGenerator já existe). É o que dá rotatividade de
  gerações e mantém o mundo vivo por décadas. Systems Aging/Retirement/Talent
  Generation já previstos no simulation_director.md.

- 🟢 **Calibração do topo do ranking.** Com forma+lesões+`k=0.03` o grosso do
  ranking bate o real (~206–310), mas o 1º–2º ficam ~30% acima. Reduzir exigiria
  limitar comparecimento/pódios da elite nos grandes eventos (mecanismo além dos
  documentos atuais) — decidir com o usuário antes de implementar.

## Forma/Lesões — implicações na UI (fazer depois)

- 🟢 Mostrar **status "lesionado"** e a data de retorno na ficha/listas; filtrar
  ou marcar lesionados no ranking.
- 🟢 Mostrar a **forma do dia** do atleta num evento (e o desgaste acumulado).
- 🟢 **Notícias** de lesão/retorno (o Event Bus já emite AthleteInjured/Recovered).

- 🟡 **Formatos especiais e anos especiais.** Incluir Grand Slam/Team/World Cup
  (formatos próprios) e, nos anos certos, Mundial (G-8) e Olimpíadas (G-20) com
  repescagem (§7). Eventos exclusivamente femininos entram com o feminino.

## Interface (próximos incrementos)

- ✅ **Bandeiras dos países** — feito (`config/flags.js`), em todas as telas.
- ✅ **Setas de movimento no ranking** — feito (▲/▼ com nº).
- ✅ **Tela de campeonato clicável** (inscritos previstos / resultados +
  classificação por peso) — feito.
- ✅ **Próximos campeonatos na ficha do atleta** — feito.
- ✅ **Aba de Favoritos e busca dedicada** — feito.
- ✅ **Tela de detalhe de país** — feito (modal com medalhas, melhor por
  categoria e atletas).
- ✅ **Notícias de lesão/recuperação** — feito (feed de Notícias + selo de
  lesionado no ranking).
- ✅ **Ranking mostra todos os atletas** — feito (256/categoria).
- ✅ **Ranking de início do campeonato nos confrontos** — feito.
- 🟢 **Gráficos de evolução de ranking, filtros e tela de Configurações.**
- 🟢 **Avanço longo em blocos** com barra de progresso (hoje é síncrono; rápido,
  mas várias temporadas de uma vez poderiam travar a UI momentaneamente).
- 🟢 **Poda das lutas antigas.** `competition.matches` cresce o save ao longo das
  temporadas; podar competições muito antigas quando o save ficar grande.
- 🟢 **Ranking com 256 linhas por categoria** — funciona, mas ao acumular muitas
  temporadas vale virtualizar a lista (render sob demanda) no alvo mobile.

## Melhorias técnicas pendentes

- 🟢 **Bloqueio de equipe/clube nas chaves** (`taekwondo-ranking.md` §6, último
  item). Requer entidade Club/Academia, ainda não modelada.
- 🟢 **Auditoria de aleatoriedade** (registro de randomValues por evento,
  `random_system.md`). Estrutura prevista, ativação adiada.
- 🟢 **Modo Histórico do Random System** (recriar cenários conhecidos).
- ✅ **Calibração do combate** — feito (`COMBAT_CONFIG.k=0.03`): iguais ~51%,
  gap4 ~64%, gap10 ~80%, gap24 ~98%. Ajustável em `probability.js`.
- 🟢 **Mecânicas de combate futuras** (fight_algorithm.md → Extensibilidade):
  knockout, golden point explícito, revisão por vídeo, lesões durante a luta,
  desistências, desclassificações. Entram como etapas complementares do fluxo.
- 🟢 **Pools de nomes pequenos.** Alguns países têm poucos nomes masculinos
  (CN: 9, KR: 10), gerando repetição de primeiros nomes com muitos atletas.
  Combos ainda dão centenas de nomes únicos por país, mas ao escalar o seed
  vale ampliar os dicionários de origem ou combinar nome do meio.
