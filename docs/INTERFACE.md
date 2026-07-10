# Documento de Arquitetura da Interface (UI)

Simulador de Ecossistema Mundial de Taekwondo

## Objetivo

Definir a arquitetura da interface, respeitando as diretrizes do projeto:
Mobile First, Vanilla JS (ES Modules), sem frameworks, separação absoluta entre
interface e simulação, componentização e comunicação por comandos/consultas.

---

## Princípios seguidos (das diretrizes)

- **Mobile First / Android.** Telas pequenas primeiro: barra superior fixa,
  navegação inferior com 4 abas, botões grandes, rolagem vertical, uso com um
  dedo. Layout responsivo (Flexbox/Grid, unidades relativas, `env(safe-area)`).
- **Separação absoluta interface × simulação.** A UI **nunca** contém lógica de
  simulação nem acessa o `world`/engine diretamente. Tudo passa pelo
  `GameController` (fachada de comandos e consultas).
- **Vanilla JS + ES Modules.** Sem React/Vue. Importa os módulos do motor
  diretamente no navegador (`<script type="module">`).
- **Componentização.** Cards, chips, badges, linhas e páginas reutilizáveis.
- **Máquina de estados.** `MENU → SIMULATION` (com estado de carregamento).
- **Persistência.** `localStorage` via `StorageService` (injetado no bootstrap).

---

## Camadas

```
index.html                casca + viewport mobile
src/main.js               bootstrap (monta Storage + GameController + App)
src/styles/main.css       tema (claro/escuro), mobile-first
│
src/app/gameController.js  FACHADA: comandos + consultas sobre o motor
│                          (a UI só conversa com esta camada)
│
src/ui/
├── app.js                 máquina de estados, barra superior, navegação, router
├── dom.js                 helpers de DOM (sem innerHTML)
├── components.js          componentes reutilizáveis (badge, chip, linha, barra)
└── pages/
    ├── ranking.js         seletor de categoria + lista ranqueada
    ├── calendar.js        próximos eventos
    ├── news.js            resultados recentes
    ├── countries.js       quadro de países
    └── athlete.js         modal de detalhes do atleta
```

---

## GameController (fachada)

Único ponto de contato da UI com o motor. Não contém regras de simulação;
apenas coordena e traduz o estado do mundo em dados de leitura.

**Comandos**
- `newGame(seed)` — constrói o mundo real e agenda a 1ª temporada.
- `loadGame()` / `save()` / `hasSave()` — persistência.
- `advanceToNextEvent()` — avança até o próximo evento (retorna os pódios).
- `advanceOneDay()` — avança um dia.
- `toggleFavoriteAthlete(id)`.

**Consultas** (sempre dados prontos, nunca entidades internas)
- `getState()`, `getCategories()`.
- `getRanking(categoryId)`, `getAthlete(id)`.
- `getCountryTable()`, `getUpcomingEvents()`, `getRecentResults()`.
- `searchAthletes(query)`.

O agendamento de temporadas é automático: ao acabar o calendário, o controlador
agenda a próxima temporada (repetindo o calendário oficial com o ano deslocado),
mantendo o decaimento e a regra best-N ativos.

**Atributos ocultos.** `getAthlete` expõe apenas os atributos visíveis
(técnicos/físicos/mentais). Potencial e demais ocultos (athlete_attributes.md)
não são enviados à UI.

---

## Fluxo de atualização

```
Usuário toca "Próximo evento"
   ↓
App.advance() → GameController.advanceToNextEvent()
   ↓ (Simulation Director processa os dias; publica eventos no World Event Bus)
GameController coleta os CompetitionFinished e devolve os pódios
   ↓
App re-renderiza a casca e exibe o modal de resultados
```

A UI reage por re-render após cada comando. Os eventos do World Event Bus são
usados internamente pelo controlador (ex.: coletar resultados), mantendo o
desacoplamento previsto na arquitetura.

---

## Telas

1. **Ranking** — abas por categoria masculina + lista (posição, nome, país,
   pontos). Toque abre o modal do atleta.
2. **Calendário** — o ano inteiro (todos os eventos, realizados e a disputar)
   agrupado por mês, com status e navegação entre anos. Mundo inicia em
   01/01/2026, então a temporada 2026 completa aparece desde o começo.
3. **Resultados** — campeões recentes por evento/categoria.
4. **Países** — quadro por pontos de ranking e medalhas.
5. **Modal de Atleta** — identidade, forma/moral/experiência, estatísticas,
   atributos visíveis em barras e histórico. Botão de favorito.

---

## Como executar

Servir a raiz do repositório por HTTP (ES Modules exigem http, não `file://`) e
abrir `index.html`. Ex.: qualquer servidor estático apontando para a raiz.
No navegador, o estado é salvo em `localStorage`.

---

## Pendências da UI (ver TODO.md)

- Página/aba de favoritos e busca dedicada (a busca já existe no controlador).
- Bandeiras (requer mapa IOC→ISO-2).
- Gráficos de evolução de ranking; filtros; tela de configurações.
- Processamento em blocos com barra de progresso para avanços muito longos.
