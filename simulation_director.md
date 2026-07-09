Documento de Arquitetura

Simulation Director

Versão: 1.0
Status: Diretriz de Arquitetura
Prioridade: Obrigatória

---

Objetivo

O Simulation Director é o núcleo responsável por coordenar toda a evolução do mundo do simulador.

Ele não executa regras de negócio específicas (como simular uma luta ou calcular evolução de atributos). Sua única responsabilidade é determinar quando cada sistema deve ser executado, em qual ordem e como os resultados são distribuídos para o restante do mundo.

Seu papel é semelhante ao de um maestro conduzindo uma orquestra.

---

Responsabilidades

O Simulation Director deve:

- controlar o avanço do tempo;
- controlar a ordem de execução dos sistemas;
- impedir conflitos entre sistemas;
- distribuir eventos produzidos pelos módulos;
- garantir consistência dos dados;
- realizar o salvamento do estado global somente ao final do ciclo.

O Simulation Director não deve:

- possuir regras de luta;
- modificar diretamente atributos dos atletas;
- conter regras específicas de campeonatos;
- conhecer detalhes internos de qualquer módulo.

Toda lógica específica pertence aos sistemas especializados.

---

Filosofia

Cada sistema deve possuir apenas uma responsabilidade.

O Simulation Director apenas coordena.

Isso permite:

- alta modularidade;
- facilidade de manutenção;
- expansão futura;
- testes independentes;
- baixo acoplamento.

---

Fluxo Geral

Usuário

↓

Avançar Tempo

↓

Simulation Director

↓

Executa Pipeline

↓

Atualiza Mundo

↓

Salva Estado

---

Pipeline Oficial

Toda simulação deverá seguir exatamente esta ordem.

1. Time System

Responsável por:

- avançar data;
- identificar mudança de dia;
- identificar mudança de mês;
- identificar mudança de temporada;
- atualizar calendário.

Saída:

Estado temporal atualizado.

---

2. Calendar System

Verifica todos os eventos agendados para a data atual.

Exemplos:

- treinos;
- campeonatos;
- inscrições;
- convocações;
- eventos especiais.

Saída:

Lista de eventos do dia.

---

3. Training System

Executa treinamentos.

Pode alterar:

- técnica;
- velocidade;
- resistência;
- experiência;
- fadiga.

Não pode:

- gerar campeões automaticamente;
- ignorar potencial;
- ignorar idade.

---

4. Recovery System

Responsável por:

- recuperação física;
- redução de fadiga;
- evolução de lesões;
- recuperação de pequenas lesões.

---

5. Athlete AI System

Cada atleta toma decisões individuais.

Exemplos:

- mudar estilo de luta;
- trocar treinador;
- aceitar convite;
- aposentar-se;
- focar em determinado campeonato.

Nenhuma decisão deve depender do usuário.

---

6. Federation AI System

Cada federação possui autonomia.

Pode:

- organizar torneios;
- contratar técnicos;
- convocar atletas;
- investir em categorias;
- abrir centros de treinamento;
- definir prioridades esportivas.

Cada federação deve possuir personalidade própria.

---

7. Competition System

Caso exista competição na data:

- monta chave;
- valida inscritos;
- organiza confrontos;
- envia confrontos para o Combat Engine;
- recebe resultados;
- registra estatísticas.

Importante:

O Competition System nunca decide quem vence.

---

8. Combat Engine

Recebe:

Atleta A

versus

Atleta B

Retorna:

Vencedor

Pontuação

Eventos da luta

Penalidades

Duração

Golpes relevantes

Lesões

O Combat Engine deve ser completamente independente.

---

9. Consequence System

Após cada luta:

- atualiza experiência;
- atualiza moral;
- aplica lesões;
- registra rivalidades;
- atualiza histórico;
- atualiza sequência de vitórias;
- atualiza estatísticas.

---

10. Ranking System

Atualiza:

- ranking mundial;
- ranking continental;
- ranking nacional;
- pontuação olímpica;
- classificação por categoria.

---

11. News System

Transforma acontecimentos em notícias.

Exemplos:

- campeão mundial;
- surpresa do torneio;
- aposentadoria;
- lesão grave;
- recorde histórico.

As notícias alimentam toda a interface do usuário.

---

12. Save System

Última etapa obrigatória.

Responsável por:

- persistência;
- backup;
- consistência dos dados.

Nenhum sistema deve salvar individualmente.

Todo salvamento passa pelo Save System.

---

Comunicação Entre Sistemas

A comunicação deve ocorrer por eventos.

Exemplo:

CombatEngine

↓

FightFinished

↓

RankingSystem

↓

NewsSystem

↓

StatisticsSystem

Nenhum módulo deve acessar diretamente o código interno do outro.

---

Dependências

Simulation Director

├── Time System
├── Calendar System
├── Training System
├── Recovery System
├── Athlete AI System
├── Federation AI System
├── Competition System
├── Combat Engine
├── Consequence System
├── Ranking System
├── News System
└── Save System

Todos os módulos devem ser independentes.

---

Ordem de Execução

A ordem de execução é fixa.

Time

↓

Calendar

↓

Training

↓

Recovery

↓

Athlete AI

↓

Federation AI

↓

Competition

↓

Combat Engine

↓

Consequences

↓

Rankings

↓

News

↓

Save

Essa sequência somente poderá ser alterada caso exista justificativa técnica documentada.

---

Escalabilidade

Novos sistemas deverão ser adicionados sem modificar o núcleo do Simulation Director.

Exemplos futuros:

- Olympic Qualification System
- Referee Management System
- Doping Control System
- Sponsorship System
- Hall of Fame System
- Talent Generation System
- Retirement System
- Historical Archive System
- Media System
- Injury Research System
- Coach Career System
- Financial System
- International Relations System

Todos devem seguir a mesma filosofia:

receber estado → processar → devolver estado, sem alterar diretamente o funcionamento dos demais módulos.

---

Princípios Obrigatórios

1. O Simulation Director nunca contém regras de negócio.
2. Cada sistema possui apenas uma responsabilidade.
3. Nenhum sistema salva dados diretamente.
4. Nenhum sistema depende internamente de outro.
5. Toda comunicação ocorre por eventos ou interfaces públicas.
6. A ordem do pipeline é determinística.
7. O mundo deve produzir sempre os mesmos resultados quando iniciado com o mesmo estado e a mesma semente aleatória.
8. A arquitetura deve permitir expansão contínua sem necessidade de reescrever o núcleo da simulação.

---

Objetivo Final

O Simulation Director deve atuar como o orquestrador central do ecossistema do simulador, garantindo que todos os módulos trabalhem de forma organizada, previsível e desacoplada. Essa arquitetura deve servir como base para um mundo esportivo persistente, capaz de evoluir por décadas simuladas com estabilidade, desempenho e facilidade de manutenção.
