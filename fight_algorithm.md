Algoritmo da Engine de Combate

Objetivo

Este documento define o algoritmo oficial utilizado pela Engine de Combate do simulador de Taekwondo.

Ele estabelece a ordem de execução das decisões, garantindo que toda luta siga exatamente a mesma estrutura lógica, independentemente de como a implementação for realizada.

Este documento descreve o fluxo, não o código.

---

Princípios

A Engine deve simular o comportamento de uma luta real.

Ela não compara atributos para escolher um vencedor.

Ela simula uma sequência de pequenas decisões esportivas.

O vencedor será consequência natural dessas decisões.

---

Estrutura Geral

Uma luta possui:

- Preparação
- Rounds
- Sequências de Trocas
- Encerramento

Cada round possui diversas trocas de ações.

Cada troca representa alguns segundos do combate.

---

Fluxo Principal

Início da luta

↓

Preparação

↓

Definir plano tático inicial

↓

Round 1

↓

Trocas de ações

↓

Round 2

↓

Trocas de ações

↓

Round 3

↓

Trocas de ações

↓

Verificar vencedor

↓

Registrar estatísticas

↓

Encerrar luta

---

Etapa 1 — Preparação

Carregar:

- Atleta A
- Atleta B
- Categoria
- Competição
- Regulamento
- Estado físico
- Forma atual
- Moral

Calcular modificadores temporários.

Exemplos:

- bônus de forma;
- fadiga acumulada;
- experiência;
- vantagem estratégica.

---

Etapa 2 — Plano Tático Inicial

Cada atleta recebe um plano de luta.

Exemplos:

- ofensivo;
- defensivo;
- equilibrado;
- pressão constante;
- contra-atacador;
- administrar vantagem;
- buscar pontuação rápida.

O plano altera probabilidades, mas nunca substitui os atributos.

---

Etapa 3 — Início do Round

Ao iniciar um round:

- atualizar energia;
- atualizar agressividade;
- atualizar confiança;
- redefinir estado temporário.

---

Etapa 4 — Troca de Ações

Cada round possui várias trocas.

Cada troca segue exatamente a sequência abaixo.

---

Passo 1

Determinar quem controla a distância.

Influências:

- velocidade;
- controle de distância;
- inteligência tática.

Resultado:

Atleta A

ou

Atleta B

---

Passo 2

Determinar quem toma a iniciativa.

Influências:

- velocidade;
- plano tático;
- placar;
- moral.

---

Passo 3

Escolher ação.

Exemplos:

- ataque simples;
- combinação;
- chute giratório;
- ataque rápido;
- pressão;
- espera.

A escolha depende de:

- atributos;
- plano tático;
- situação do combate.

---

Passo 4

Resolver resposta defensiva.

Possibilidades:

- bloqueio;
- esquiva;
- absorção;
- contra-ataque.

---

Passo 5

Resolver contra-ataque.

Caso exista oportunidade:

avaliar:

- velocidade;
- leitura de luta;
- contra-ataque.

---

Passo 6

Validar ataque.

Calcular:

- precisão;
- qualidade da oportunidade;
- defesa adversária;
- fatores aleatórios.

Resultado:

golpe válido

ou

golpe inválido

---

Passo 7

Determinar pontuação.

Caso válido:

calcular:

- quantidade de pontos;
- tipo de pontuação;
- registro estatístico.

---

Passo 8

Atualizar estado da luta.

Atualizar:

- placar;
- energia;
- confiança;
- estatísticas;
- momentum.

---

Passo 9

Verificar mudança de comportamento.

Exemplos:

Atleta perdendo.

↓

Aumentar agressividade.

Atleta vencendo.

↓

Administrar vantagem.

Atleta muito cansado.

↓

Diminuir frequência ofensiva.

---

Passo 10

Iniciar próxima troca.

O ciclo continua até terminar o round.

---

Etapa 5 — Final do Round

Atualizar:

- energia;
- fadiga;
- confiança;
- momentum.

Verificar necessidade de ajuste tático.

---

Etapa 6 — Próximo Round

Repetir exatamente o mesmo algoritmo.

---

Etapa 7 — Encerramento

Ao finalizar os rounds:

Determinar vencedor conforme o regulamento vigente.

Atualizar:

- vencedor;
- derrotado;
- estatísticas;
- histórico;
- ranking;
- resultados da competição.

---

Momentum

Durante toda a luta existe um estado chamado Momentum.

Ele representa quem vive o melhor momento do combate.

Pode aumentar após:

- sequência de pontos;
- boa defesa;
- contra-ataque eficiente.

Pode diminuir após:

- sofrer muitos pontos;
- erros consecutivos;
- perda de confiança.

O Momentum nunca decide sozinho uma luta, mas influencia as probabilidades das próximas trocas.

---

Energia

Cada ação possui um custo.

Quanto menor a energia:

- menor velocidade;
- menor precisão;
- menor agressividade;
- maior chance de erro.

A Resistência define a velocidade desse desgaste.

---

Confiança

A confiança varia durante a luta.

Pode aumentar após:

- pontuar;
- dominar ações;
- abrir vantagem.

Pode diminuir após:

- sofrer sequência de pontos;
- perder oportunidades;
- ficar muito atrás no placar.

A confiança modifica levemente as decisões da IA.

---

Aleatoriedade

A Engine utiliza um gerador de números aleatórios controlado.

Os atributos alteram probabilidades.

Eles nunca garantem resultados.

Objetivos:

- permitir zebras ocasionais;
- manter favoritos consistentes;
- produzir diversidade de resultados.

---

Estatísticas Produzidas

Ao final da luta podem ser registrados:

- pontos por round;
- ataques realizados;
- ataques convertidos;
- aproveitamento;
- bloqueios;
- contra-ataques;
- eficiência ofensiva;
- eficiência defensiva;
- sequência máxima de pontos;
- tempo de domínio;
- vencedor.

---

Responsabilidades

A Engine de Combate é responsável apenas por determinar o resultado técnico da luta.

Ela não:

- atualiza rankings;
- distribui medalhas;
- altera histórico;
- salva dados.

Essas responsabilidades pertencem ao Simulation Pipeline e aos Services específicos.

---

Extensibilidade

O algoritmo deve permitir, futuramente, a inclusão de novas mecânicas sem alterar sua estrutura principal, como:

- advertências (Gam-jeom);
- revisões por vídeo;
- lesões;
- desistências;
- desclassificações;
- regras específicas de diferentes competições;
- inteligência artificial mais sofisticada para escolha de estratégias.

Toda nova funcionalidade deverá ser incorporada como uma etapa complementar do fluxo, preservando a ordem lógica definida neste documento.

---

Filosofia da Engine

A Engine de Combate não busca reproduzir cada movimento de uma luta real, mas sim representar sua dinâmica por meio de uma sucessão de decisões probabilísticas influenciadas pelos atributos, pelo contexto e pela estratégia de cada atleta.

Cada combate deve gerar uma narrativa plausível, produzindo resultados variados, estatisticamente consistentes e capazes de sustentar décadas de simulação sem perda de credibilidade.
