Documento 2:
Documento de Arquitetura de Software

Simulador de Campeonatos e Rankings de Taekwondo

Objetivo

Definir a arquitetura técnica do projeto, estabelecendo padrões de organização, responsabilidades de cada módulo e fluxo interno da simulação.

O projeto deve priorizar:

- simplicidade;
- alta organização;
- facilidade de manutenção;
- modularidade;
- baixo acoplamento;
- escalabilidade;
- compatibilidade com dispositivos móveis.

---

Stack Tecnológica

Front-end

- HTML5
- CSS3
- JavaScript (ES2023)

Não serão utilizados frameworks pesados como React, Angular ou Vue na versão inicial.

A interface será construída utilizando JavaScript puro (Vanilla JS), mantendo baixo consumo de memória e carregamento rápido.

---

Persistência

Inicialmente:

- LocalStorage

Posteriormente poderá ser adicionada uma camada de persistência utilizando:

- IndexedDB

Sem necessidade de alterar a lógica principal da engine.

---

Banco de Dados

Toda a base será composta por arquivos JavaScript/JSON organizados em módulos.

Exemplo:

database/

- athletes.js
- competitions.js
- countries.js
- federations.js
- rankings.js
- calendar.js
- categories.js

---

Arquitetura Geral

O projeto utilizará arquitetura modular.

Nenhum módulo deve acessar diretamente os dados internos de outro módulo.

Toda comunicação ocorrerá através de serviços e eventos.

Fluxo simplificado:

Interface

↓

Controllers

↓

Simulation Engine

↓

Services

↓

Database

---

Organização das Pastas

src/

core/

database/

entities/

engine/

services/

events/

ui/

screens/

utils/

config/

assets/

---

Entidades

Cada entidade representa apenas seus dados.

Não executa lógica.

Exemplos:

Athlete

Competition

Country

Federation

Ranking

CalendarEvent

Category

---

Services

Responsáveis por manipular entidades.

Exemplos:

AthleteService

CompetitionService

RankingService

CountryService

FederationService

CalendarService

StatisticsService

HistoryService

FavoriteService

---

Engine

A Engine coordena toda a simulação.

Ela nunca altera dados diretamente.

Ela apenas solicita ações aos Services.

---

Fluxo da Engine

Ao avançar um dia:

1. Ler data atual.

2. Buscar eventos daquele dia.

3. Simular cada competição.

4. Atualizar atletas.

5. Atualizar rankings.

6. Atualizar estatísticas.

7. Atualizar históricos.

8. Salvar estado.

9. Emitir eventos.

10. Avançar para o próximo dia.

---

Event Bus

Toda comunicação entre sistemas ocorrerá através de um Event Bus.

Isso evita dependências diretas entre módulos.

Exemplo:

Calendar → Competition

Competition → Ranking

Ranking → Statistics

Statistics → History

History → Interface

Cada sistema apenas publica eventos.

Quem precisar deles apenas escuta.

---

Eventos Base

DAY_STARTED

DAY_FINISHED

COMPETITION_STARTED

COMPETITION_FINISHED

MATCH_FINISHED

RANKING_UPDATED

ATHLETE_UPDATED

COUNTRY_UPDATED

STATISTICS_UPDATED

SAVE_COMPLETED

GAME_LOADED

GAME_SAVED

YEAR_CHANGED

MONTH_CHANGED

WEEK_CHANGED

---

Benefícios do Event Bus

Baixo acoplamento.

Maior facilidade para adicionar funcionalidades.

Melhor organização.

Facilidade para testes.

Escalabilidade.

---

Controllers

Os Controllers apenas recebem ações da interface.

Exemplo:

AdvanceDayController

AdvanceWeekController

AdvanceMonthController

FavoriteController

SearchController

CalendarController

---

Interface

A interface nunca acessa o banco de dados diretamente.

Toda informação deve ser solicitada aos Services.

---

IDs

Todas as entidades possuirão IDs permanentes.

Nunca utilizar nomes como referência.

Relacionamentos sempre ocorrerão por ID.

---

Estado Global

A aplicação possuirá apenas um estado global.

Exemplo:

WorldState

Dentro dele estarão:

- data atual;
- temporada;
- rankings;
- favoritos;
- configurações;
- cache;
- histórico.

---

Princípios

Single Responsibility Principle (SRP)

Cada módulo possui apenas uma responsabilidade.

Open/Closed Principle (OCP)

Novas funcionalidades devem ser adicionadas sem modificar sistemas existentes.

Baixo Acoplamento

Módulos independentes.

Alta Coesão

Cada sistema realiza apenas sua função.

Separação entre Dados e Regras

Entidades armazenam dados.

Services executam regras.

Engine coordena a simulação.

---

Escalabilidade

A arquitetura deverá permitir futuramente:

- novos tipos de competição;
- novas categorias;
- novas modalidades do taekwondo;
- novos sistemas de ranking;
- geração de atletas;
- aposentadorias;
- notícias automáticas;
- histórico mundial;
- estatísticas avançadas;
- exportação e importação de saves.

Nenhuma dessas expansões deverá exigir reestruturação da arquitetura principal."
