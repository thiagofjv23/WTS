Documento 6:
Documento de Arquitetura de Dados (Data Architecture)

Simulador de Campeonatos e Rankings de Taekwondo

Objetivo

Definir a estrutura de dados do simulador, estabelecendo as entidades do mundo, seus atributos, relacionamentos e regras de integridade.

Este documento é a referência oficial para qualquer implementação da camada de dados.

---

Filosofia

O simulador representa um ecossistema esportivo persistente.

Cada objeto do mundo existe como uma entidade independente, identificada por um ID único e relacionada a outras entidades por referências, nunca por nomes.

Os dados devem refletir o estado completo do mundo em qualquer momento da simulação.

---

Princípios

- Toda entidade possui ID único e permanente.
- Nenhum relacionamento utiliza nomes como chave.
- Dados e lógica de negócio permanecem separados.
- Relacionamentos são explícitos.
- Toda entidade deve ser serializável para JSON.
- O modelo deve permitir expansão sem quebra de compatibilidade.

---

Entidade: Athlete

Representa um atleta.

Campos mínimos

- id
- fullName
- countryId
- gender
- birthDate
- weightCategoryId
- rankingPosition
- rankingPoints
- status (ativo, lesionado, aposentado, suspenso)
- attributes
- statistics
- history
- favorite (opcional, armazenado no estado do usuário)

Relacionamentos:

- pertence a um país;
- participa de várias competições;
- acumula diversos resultados;
- possui um histórico permanente.

---

Entidade: Country

Representa um país.

Campos:

- id
- name
- code (ISO)
- continentId
- federationId
- athleteIds
- statistics

Relacionamentos:

- possui vários atletas;
- pertence a um continente;
- é filiado à federação mundial.

---

Entidade: Federation

Representa uma organização esportiva.

Exemplos:

- World Taekwondo
- Federações continentais
- Federações nacionais

Campos:

- id
- name
- type
- parentFederationId
- countryId (quando nacional)
- competitionIds

---

Entidade: Competition

Representa um campeonato.

Campos:

- id
- name
- organizerFederationId
- competitionType
- location
- startDate
- endDate
- categoryIds
- status
- edition
- historicalResults

Relacionamentos:

- organizada por uma federação;
- contém várias categorias;
- gera resultados;
- gera pontos de ranking.

---

Entidade: CalendarEvent

Representa um evento do calendário.

Campos:

- id
- date
- competitionId
- status
- processed

A engine consulta apenas esta entidade para descobrir o que deve ser simulado em cada dia.

---

Entidade: WeightCategory

Representa uma categoria de peso.

Campos:

- id
- name
- gender
- minimumWeight
- maximumWeight

Relacionamentos:

- utilizada por atletas;
- utilizada por competições.

---

Entidade: Ranking

Representa uma classificação oficial.

Campos:

- id
- type (mundial, continental, nacional)
- categoryId
- athleteIds
- lastUpdated

---

Entidade: Match

Representa uma luta.

Campos:

- id
- competitionId
- categoryId
- round
- athleteAId
- athleteBId
- winnerId
- score
- date

Relacionamentos:

- pertence a uma competição;
- envolve dois atletas;
- gera estatísticas.

---

Entidade: Result

Representa o resultado final de um atleta em uma competição.

Campos:

- id
- athleteId
- competitionId
- placement
- medal
- rankingPointsEarned

---

Entidade: Statistics

Estrutura responsável por armazenar indicadores agregados.

Pode existir para:

- atleta;
- país;
- competição;
- temporada;
- mundo.

---

Entidade: History

Armazena registros permanentes.

Exemplos:

- campeão mundial de 2028;
- medalhistas olímpicos de 2032;
- vencedor do Grand Prix de Paris.

Nenhum registro histórico deve ser removido.

---

Entidade: WorldState

Representa o estado global da simulação.

Campos:

- currentDate
- currentSeason
- processedDays
- favoriteAthletes
- favoriteCountries
- favoriteCompetitions
- configuration
- version

Esta é a principal estrutura salva no jogo.

---

Relacionamentos

Country

↓

Athlete

↓

Result

↓

Competition

↓

Federation

↓

CalendarEvent

↓

WorldState

Além disso:

Competition

↓

Match

↓

Result

↓

Ranking

↓

Statistics

↓

History

---

Integridade Referencial

Toda referência deve apontar para um ID existente.

Exemplos:

countryId deve existir.

competitionId deve existir.

athleteId deve existir.

A engine deve validar referências ao carregar ou salvar os dados.

---

Versionamento

Cada entidade poderá conter um campo opcional:

schemaVersion

Isso permitirá migrações futuras sem quebrar saves antigos.

---

Serialização

Todas as entidades deverão ser compatíveis com JSON.

Não utilizar referências circulares.

Relacionamentos devem ocorrer apenas por IDs.

---

Extensibilidade

O modelo deve permitir adicionar novas entidades sem alterar as existentes.

Exemplos futuros:

- Coach
- Club
- Team
- Sponsor
- Referee
- OlympicCycle
- Injury
- AntiDopingCase
- NewsArticle
- HallOfFame

Essas entidades deverão integrar-se ao ecossistema por meio de relacionamentos baseados em IDs e eventos da engine.

---

Fonte Única da Verdade

Cada informação deve possuir apenas um local oficial de armazenamento.

Exemplos:

- Nome do atleta → Athlete.
- Nome do país → Country.
- Data atual → WorldState.
- Resultado da competição → Result.
- Histórico → History.
- Ranking → Ranking.

Duplicações de dados devem ser evitadas sempre que possível, reduzindo inconsistências e simplificando a manutenção."

Temos uma base sólida para iniciar a programação?
