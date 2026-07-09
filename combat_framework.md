Arquitetura da Combat Framework

Objetivo

Este documento define a arquitetura interna do sistema de combate.

Em vez de uma única Combat Engine responsável por toda a simulação da luta, o projeto utilizará uma Combat Framework, composta por diversos módulos especializados.

Cada módulo possui responsabilidade única, permitindo manutenção, testes e evolução independentes.

---

Filosofia

O combate é um pipeline.

Cada engine recebe o estado atual da luta, processa apenas sua responsabilidade e entrega o estado atualizado para a próxima engine.

Nenhuma engine modifica diretamente responsabilidades pertencentes a outro módulo.

---

Fluxo Geral

Fight Manager
        │
        ▼
Decision Engine
        │
        ▼
Probability Engine
        │
        ▼
Rules Engine
        │
        ▼
Scoring Engine
        │
        ▼
State Engine
        │
        ▼
Statistics Engine
        │
        ▼
Fight Manager

O Fight Manager é o orquestrador do combate.

Ele controla a ordem de execução, mas não implementa regras específicas.

---

Fight Manager

Responsabilidade

Coordenar toda a luta.

Funções:

- iniciar luta;
- iniciar rounds;
- iniciar trocas;
- chamar as engines;
- controlar tempo;
- encerrar luta.

O Fight Manager nunca calcula probabilidades nem pontuação.

---

Decision Engine

Responsabilidade

Escolher a próxima ação dos atletas.

Entradas:

- atributos;
- plano tático;
- estado atual;
- placar;
- momentum.

Saída:

Ação escolhida.

Exemplos:

- atacar;
- pressionar;
- recuar;
- esperar;
- contra-atacar;
- administrar vantagem.

Esta engine responde apenas à pergunta:

"O que o atleta tentará fazer agora?"

---

Probability Engine

Responsabilidade

Transformar atributos em probabilidades.

Entradas:

- ação escolhida;
- atributos dos atletas;
- energia;
- confiança;
- forma atual;
- experiência.

Saída:

Probabilidades de sucesso.

Exemplos:

- chance de acertar;
- chance de defender;
- chance de contra-atacar;
- chance de erro técnico.

Esta engine nunca decide vencedores.

Ela apenas calcula probabilidades.

---

Rules Engine

Responsabilidade

Aplicar as regras oficiais da modalidade e da competição.

Exemplos:

- sistema de pontuação;
- duração dos rounds;
- critérios de vitória;
- Gam-jeom;
- desclassificações;
- desempates;
- regras específicas de um evento.

A lógica deve ser parametrizada para permitir adaptações futuras sem alterar outras engines.

---

Scoring Engine

Responsabilidade

Converter ações válidas em pontuação oficial.

Entradas:

- resultado da ação;
- regras da competição.

Saídas:

- pontos;
- penalidades;
- placar atualizado.

Esta engine é a única autorizada a modificar o placar da luta.

---

State Engine

Responsabilidade

Controlar o estado dinâmico dos atletas durante a luta.

Estados monitorados:

- energia;
- fadiga;
- confiança;
- momentum;
- agressividade;
- ritmo.

Esses estados podem variar ao longo do combate e influenciam as decisões futuras.

Nenhum desses estados altera permanentemente os atributos do atleta.

---

Statistics Engine

Responsabilidade

Registrar todos os acontecimentos relevantes do combate.

Exemplos:

- ataques tentados;
- ataques válidos;
- bloqueios;
- contra-ataques;
- pontos por round;
- tempo em vantagem;
- eficiência ofensiva;
- eficiência defensiva.

Ao final da luta, gera um relatório estatístico que será utilizado pelo restante da simulação.

---

Comunicação

As engines não devem comunicar-se diretamente.

Toda comunicação ocorre através do Fight State, objeto compartilhado que representa o estado atual da luta.

Cada engine:

1. recebe o Fight State;
2. processa apenas sua responsabilidade;
3. devolve o Fight State atualizado.

---

Fight State

O Fight State representa o estado completo do combate em um determinado instante.

Exemplos de informações armazenadas:

- atletas;
- placar;
- round atual;
- tempo restante;
- energia;
- confiança;
- momentum;
- plano tático;
- estatísticas temporárias;
- eventos da luta.

Ele é a única fonte de verdade durante o combate.

---

Vantagens

Baixo Acoplamento

Cada engine possui responsabilidade única.

---

Testabilidade

Cada engine pode ser testada isoladamente.

---

Facilidade de Balanceamento

Alterações na pontuação não exigem mudanças na IA de decisão.

Mudanças na IA não exigem alterações na geração de estatísticas.

---

Escalabilidade

Novos sistemas podem ser adicionados facilmente.

Exemplos:

- AI Coach Engine;
- Referee Engine;
- Replay Engine;
- Injury Engine;
- Video Review Engine;
- Commentary Engine.

---

Ordem Oficial de Execução

Durante cada troca de ações, a Combat Framework deverá executar obrigatoriamente a seguinte sequência:

1. Fight Manager inicia a troca.
2. Decision Engine escolhe a ação.
3. Probability Engine calcula as probabilidades.
4. Rules Engine valida a ação conforme o regulamento.
5. Scoring Engine atualiza o placar, se aplicável.
6. State Engine atualiza energia, confiança, momentum e demais estados.
7. Statistics Engine registra os eventos da troca.
8. Fight Manager verifica se a luta continua ou se foi encerrada.

Essa ordem garante previsibilidade, desacoplamento e consistência em toda a simulação.

---

Filosofia da Combat Framework

A Combat Framework não é responsável por determinar quem vence uma luta. Sua função é simular, passo a passo, as interações entre dois atletas com base em atributos, contexto, estratégia e regras oficiais.

Ao dividir a lógica em módulos independentes, o simulador ganha flexibilidade para evoluir ao longo do tempo, incorporar novas regras e manter a consistência dos resultados sem comprometer a arquitetura do projeto.
