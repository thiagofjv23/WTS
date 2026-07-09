Documento 5:
Documento de Regras da Simulação (Simulation Rules)

Simulador de Campeonatos e Rankings de Taekwondo

Objetivo

Este documento define todas as regras de negócio do simulador.

Enquanto o Simulation Pipeline determina quando cada sistema é executado, este documento determina como cada sistema deve se comportar.

Toda regra implementada na engine deve estar descrita aqui ou em documentos derivados.

---

Princípios Gerais

O simulador deve representar um ecossistema esportivo dinâmico, coerente e evolutivo.

Todas as mudanças no mundo devem ocorrer por meio de regras explícitas e reproduzíveis.

As regras devem priorizar:

- Realismo esportivo.
- Consistência dos dados.
- Evolução de longo prazo.
- Facilidade de manutenção.
- Extensibilidade.

---

Regra 1 — O Calendário é a Fonte da Verdade

Nenhum evento pode ocorrer fora do calendário.

Toda competição deve possuir:

- ID único.
- Data de início.
- Data de término (quando aplicável).
- Local.
- Federação organizadora.
- Categorias disputadas.
- Regulamento.

Sem uma entrada válida no calendário, uma competição não existe para a engine.

---

Regra 2 — Apenas Competições Geram Resultados Oficiais

Somente competições oficiais podem alterar:

- rankings;
- estatísticas;
- histórico;
- medalhas;
- títulos.

Eventos informais ou amistosos, caso existam no futuro, não impactam o ecossistema oficial.

---

Regra 3 — Resultados São Permanentes

Após a conclusão de uma competição:

- resultados não podem ser alterados;
- medalhas permanecem registradas;
- históricos nunca são sobrescritos.

Correções deverão ocorrer apenas por mecanismos específicos previstos na engine.

---

Regra 4 — Rankings São Derivados dos Resultados

O ranking nunca é editado manualmente.

Ele é sempre recalculado com base nos resultados válidos registrados pelas competições.

---

Regra 5 — Atletas Evoluem ao Longo do Tempo

Cada atleta possui um ciclo de carreira.

Ao longo dos anos poderá:

- evoluir tecnicamente;
- atingir seu auge;
- entrar em declínio;
- mudar de categoria (se permitido pelas regras);
- encerrar a carreira;
- ser substituído por novos atletas gerados pela engine (funcionalidade futura).

Toda evolução deve ocorrer de forma gradual.

---

Regra 6 — Países Evoluem por Meio de Seus Atletas

Um país não possui desempenho próprio.

Seu desempenho é a soma dos resultados de seus atletas.

As estatísticas nacionais devem ser recalculadas automaticamente após cada dia de simulação.

---

Regra 7 — Competições São Independentes

Cada competição é simulada isoladamente.

Os resultados de uma competição não podem interferir diretamente em outra que esteja ocorrendo no mesmo dia, exceto por regras oficiais (como desistências, lesões ou suspensões, se implementadas futuramente).

---

Regra 8 — Histórico Nunca é Perdido

Todo resultado relevante deve permanecer disponível para consulta.

Exemplos:

- campeões por edição;
- medalhistas;
- confrontos;
- participação de atletas;
- evolução dos rankings;
- desempenho por país.

O histórico é acumulativo e permanente.

---

Regra 9 — IDs São Imutáveis

Toda entidade possui um identificador permanente.

Os IDs nunca podem ser reutilizados, mesmo após aposentadorias ou remoções lógicas.

Relacionamentos entre entidades devem utilizar exclusivamente esses identificadores.

---

Regra 10 — Determinismo e Aleatoriedade Controlada

A simulação utilizará fatores aleatórios apenas quando necessário, respeitando os atributos dos atletas e as probabilidades definidas pelo modelo esportivo.

O objetivo é produzir resultados plausíveis, evitando tanto a previsibilidade absoluta quanto resultados irreais.

---

Regra 11 — Estado Global Consistente

Ao final de cada ciclo diário, todas as entidades devem refletir o novo estado do mundo.

Não é permitido que um módulo permaneça desatualizado em relação aos demais.

---

Regra 12 — Eventos Não Devem Produzir Efeitos Colaterais Ocultos

Todo impacto gerado por uma ação deve ser explícito.

Exemplo:

Competição finalizada.

↓

Atualização do ranking.

↓

Atualização do histórico.

↓

Atualização das estatísticas.

Nenhuma modificação relevante pode ocorrer "silenciosamente".

---

Regra 13 — Separação Entre Dados e Regras

Entidades armazenam informações.

Services aplicam regras.

A Engine coordena a execução.

O banco de dados nunca contém lógica de negócio.

---

Regra 14 — Escalabilidade

Toda regra deve permitir expansão futura sem alterar o funcionamento básico do simulador.

Exemplos:

- inclusão de novas categorias;
- novas competições;
- novas federações;
- novos sistemas de classificação;
- novos critérios de ranking.

---

Regra 15 — Transparência

Sempre que possível, o usuário deve conseguir entender por que determinado resultado ocorreu.

O simulador deve evitar decisões "mágicas" sem justificativa observável.

---

Regra 16 — Simulação Observacional

O foco principal do projeto é observar a evolução do ecossistema mundial.

O usuário acompanha, analisa e consulta informações, enquanto a engine conduz a evolução do esporte conforme as regras estabelecidas.

Essa filosofia deve orientar qualquer funcionalidade futura, preservando a identidade do simulador.

---

Hierarquia das Regras

Em caso de conflito, a prioridade será:

1. Regras oficiais do Taekwondo e da World Taekwondo.
2. Este documento de Regras da Simulação.
3. Documento de Pipeline da Simulação.
4. Documento de Arquitetura de Software.
5. Documento de Entidades.
6. Implementação do código.

Nenhuma implementação poderá contrariar os documentos de arquitetura sem atualização prévia da documentação.

---

Evolução da Documentação

Este documento é considerado a referência central das regras de negócio do simulador.

Novas mecânicas deverão ser adicionadas por extensão, preservando os princípios existentes e mantendo a coerência do ecossistema esportivo ao longo do tempo."

