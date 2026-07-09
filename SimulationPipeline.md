Documento 4:
Documento de Arquitetura da Simulação (Simulation Pipeline)

Simulador de Campeonatos e Rankings de Taekwondo

Objetivo

Definir o fluxo oficial de execução da engine de simulação.

Toda passagem de tempo deverá seguir exatamente esta sequência, garantindo consistência dos dados e previsibilidade do comportamento da aplicação.

---

Princípios

A engine deve operar de forma:

- determinística (a mesma entrada gera o mesmo fluxo de execução);
- modular;
- orientada a eventos;
- desacoplada;
- baseada no calendário.

Nenhum módulo pode executar etapas fora da ordem definida neste documento.

---

Fluxo Geral

Sempre que o usuário solicitar um avanço de tempo (dia, semana, mês ou ano), a engine processará internamente um dia por vez.

Exemplo:

Avançar 1 mês

↓

Executar 30 ou 31 ciclos completos de simulação

↓

Atualizar interface apenas ao final (ou conforme configuração futura)

Assim, todos os acontecimentos intermediários serão respeitados.

---

Pipeline de um Dia

Etapa 1 — Início do Ciclo

Objetivos:

- bloquear novas ações do usuário durante a simulação;
- registrar a data atual;
- iniciar o ciclo de processamento.

Evento emitido:

DAY_STARTED

---

Etapa 2 — Leitura do Calendário

Consultar todos os eventos programados para a data atual.

Cada evento representa uma competição independente.

Exemplo:

- Campeonato Nacional da Coreia
- Grand Prix
- Campeonato Africano

Resultado esperado:

Lista ordenada de eventos do dia.

---

Etapa 3 — Preparação das Competições

Para cada competição:

- carregar regulamento;
- carregar categorias disputadas;
- carregar atletas inscritos;
- validar elegibilidade;
- organizar chaves ou confrontos.

Evento:

COMPETITION_STARTED

---

Etapa 4 — Simulação das Competições

Cada competição é simulada integralmente.

Para cada categoria:

1. montar confrontos;
2. simular lutas;
3. avançar vencedores;
4. definir medalhistas;
5. registrar estatísticas;
6. atribuir pontuação para ranking.

Ao término:

COMPETITION_FINISHED

---

Etapa 5 — Atualização dos Atletas

Após todas as competições do dia:

Atualizar:

- histórico;
- número de medalhas;
- vitórias;
- derrotas;
- aproveitamento;
- participação em eventos;
- ranking individual;
- estatísticas acumuladas.

Evento:

ATHLETE_UPDATED

---

Etapa 6 — Atualização dos Países

Recalcular:

- medalhas;
- pontos;
- estatísticas gerais;
- desempenho anual.

Evento:

COUNTRY_UPDATED

---

Etapa 7 — Atualização das Federações

Atualizar indicadores das federações responsáveis pelas competições realizadas.

Exemplos:

- quantidade de eventos;
- atletas participantes;
- distribuição continental;
- histórico da temporada.

---

Etapa 8 — Atualização dos Rankings

Somente após todas as competições do dia estarem concluídas.

Atualizar:

- ranking mundial;
- rankings continentais;
- rankings nacionais (quando aplicável).

Evento:

RANKING_UPDATED

---

Etapa 9 — Atualização do Histórico

Registrar permanentemente:

- campeões;
- medalhistas;
- resultados;
- posições finais;
- alterações de ranking;
- estatísticas históricas.

Nenhum dado histórico deve ser sobrescrito.

---

Etapa 10 — Atualização das Estatísticas

Recalcular indicadores agregados do ecossistema.

Exemplos:

- país com mais medalhas;
- atleta com mais títulos;
- número de eventos realizados;
- temporadas disputadas;
- vitórias acumuladas.

Evento:

STATISTICS_UPDATED

---

Etapa 11 — Verificações Temporais

Após concluir o dia, verificar mudanças de período.

Exemplos:

Mudança de semana.

Mudança de mês.

Mudança de temporada.

Mudança de ciclo olímpico.

Cada mudança poderá disparar eventos específicos, como geração de novos calendários ou fechamento de estatísticas anuais.

---

Etapa 12 — Salvamento

Persistir o estado completo do mundo.

Salvar:

- data atual;
- rankings;
- atletas;
- países;
- competições;
- histórico;
- favoritos;
- configurações.

Evento:

SAVE_COMPLETED

---

Etapa 13 — Encerramento do Dia

Avançar a data em um dia.

Liberar a interface para novas ações.

Evento:

DAY_FINISHED

O ciclo então estará pronto para iniciar novamente.

---

Ordem Oficial

A sequência abaixo é obrigatória:

1. DAY_STARTED
2. Ler calendário
3. Preparar competições
4. Simular competições
5. Atualizar atletas
6. Atualizar países
7. Atualizar federações
8. Atualizar rankings
9. Atualizar histórico
10. Atualizar estatísticas
11. Verificar mudanças temporais
12. Salvar estado
13. Avançar a data
14. DAY_FINISHED

Nenhuma etapa poderá ser invertida sem justificativa técnica documentada.

---

Regras Gerais

- Cada etapa deve ser independente e ter responsabilidade única.
- Uma falha em uma etapa deve impedir a continuação do ciclo, preservando a consistência dos dados.
- O Event Bus será o mecanismo oficial de comunicação entre módulos.
- Os módulos não devem acessar diretamente a lógica interna uns dos outros.
- Todas as modificações no estado do mundo devem ocorrer por meio dos Services definidos na arquitetura.
- A interface apenas exibe o estado final produzido pela engine, sem interferir na lógica da simulação.

---

Visão Simplificada do Pipeline

Usuário
    │
    ▼
Comando de avanço de tempo
    │
    ▼
Simulation Engine
    │
    ├── Iniciar ciclo
    ├── Ler calendário
    ├── Preparar competições
    ├── Simular competições
    ├── Atualizar atletas
    ├── Atualizar países
    ├── Atualizar federações
    ├── Atualizar rankings
    ├── Atualizar histórico
    ├── Atualizar estatísticas
    ├── Verificar mudanças temporais
    ├── Salvar estado
    ├── Avançar a data
    └── Finalizar ciclo

---

Filosofia da Engine

A engine é o núcleo do simulador. Ela não conhece detalhes específicos de atletas, competições ou rankings; apenas coordena a execução dos módulos especializados na ordem correta. Essa separação garante previsibilidade, facilidade de testes, evolução da aplicação e manutenção de longo prazo, permitindo a inclusão de novas modalidades, competições e regras sem alterar o fluxo central de simulação."
