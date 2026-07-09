Sistema de Combate

Objetivo

Este documento define o funcionamento da engine de combate do simulador de Taekwondo.

A engine não deve determinar um vencedor apenas comparando atributos.

Cada luta deverá ser composta por diversas tomadas de decisão que representam as trocas de golpes ocorridas durante os rounds.

---

Filosofia

O combate deve ser emergente.

O placar final deve surgir naturalmente como consequência das decisões tomadas durante a luta.

Cada combate deverá contar uma pequena história esportiva.

---

Estrutura Geral

Uma luta é composta por:

- preparação;
- rounds;
- sequências de ações;
- pontuação;
- encerramento.

---

Fluxo Geral

Preparação

↓

Definição do plano tático

↓

Início do Round

↓

Sequência de ações

↓

Pontuação

↓

Nova sequência

↓

Fim do Round

↓

Próximo Round

↓

Resultado Final

---

Sequência de Ações

Cada round é dividido em diversas sequências.

Cada sequência representa uma troca de ações entre os atletas.

Fluxo básico:

1. Definir qual atleta toma a iniciativa.
2. Verificar controle da distância.
3. Escolher ação ofensiva.
4. Verificar resposta defensiva.
5. Avaliar possibilidade de contra-ataque.
6. Validar pontuação.
7. Atualizar placar.
8. Iniciar nova sequência.

Esse ciclo se repete diversas vezes durante cada round.

---

Decisão da Iniciativa

A iniciativa pode ser influenciada por:

- velocidade;
- inteligência tática;
- estilo de luta;
- situação do placar;
- forma atual.

---

Controle de Distância

Antes de cada ataque, a engine avalia qual atleta domina a distância do combate.

Esse fator influencia:

- probabilidade de iniciar ataques;
- qualidade das oportunidades;
- eficiência defensiva.

---

Escolha da Ação

A engine escolhe uma ação coerente com:

- atributos;
- estilo de luta;
- plano tático;
- situação da luta.

Exemplos:

- ataque simples;
- combinação de golpes;
- chute giratório;
- ataque de oportunidade;
- pressão ofensiva;
- espera por contra-ataque.

---

Resposta Defensiva

Após um ataque:

A engine verifica:

- bloqueio;
- esquiva;
- absorção da ação;
- contra-ataque imediato.

---

Validação da Pontuação

Nem todo ataque gera pontos.

A chance de pontuação depende da combinação entre:

- precisão;
- ataque;
- defesa adversária;
- leitura de luta;
- distância;
- fatores aleatórios controlados.

---

Atualização do Placar

Após cada sequência:

- atualizar pontuação;
- registrar estatísticas da luta;
- verificar mudanças de comportamento.

---

Adaptação Durante a Luta

A estratégia do atleta pode mudar automaticamente.

Exemplos:

Se estiver perdendo:

- aumentar agressividade;
- assumir riscos.

Se estiver vencendo:

- controlar ritmo;
- reduzir exposição;
- explorar contra-ataques.

Essa adaptação utiliza principalmente o atributo Adaptabilidade.

---

Planos Táticos

Cada atleta pode iniciar a luta com um plano predominante.

Exemplos:

- Ofensivo
- Defensivo
- Contra-atacador
- Pressão constante
- Administrar vantagem
- Equilibrado
- Buscar pontuação rápida
- Esperar erro do adversário

O plano modifica probabilidades de decisão, mas não altera diretamente os atributos.

---

Influência dos Atributos

Ataque

↓

Criação de oportunidades

Precisão

↓

Conversão em pontos

Defesa

↓

Redução da eficiência ofensiva adversária

Contra-ataque

↓

Resposta após ataques

Velocidade

↓

Iniciativa

Inteligência Tática

↓

Escolha das ações

Leitura de Luta

↓

Antecipação

Sangue Frio

↓

Momentos decisivos

Resistência

↓

Queda (ou manutenção) de rendimento ao longo da luta

---

Aleatoriedade Controlada

Toda ação utiliza probabilidades.

Os atributos apenas modificam essas probabilidades.

Isso garante que:

- favoritos vençam com maior frequência;
- zebras ocorram ocasionalmente;
- atletas semelhantes produzam combates equilibrados.

---

Registro Estatístico

Durante cada luta, a engine poderá registrar informações como:

- ataques tentados;
- ataques válidos;
- aproveitamento ofensivo;
- bloqueios;
- contra-ataques;
- pontuação por round;
- sequência máxima de pontos;
- duração da luta.

Esses dados poderão alimentar estatísticas históricas e futuras telas de análise.

---

Objetivos do Sistema

A engine deve produzir combates:

- variados;
- coerentes;
- imprevisíveis dentro de limites realistas;
- influenciados pelos atributos;
- influenciados pela estratégia;
- consistentes ao longo de milhares de simulações.

O resultado final nunca deve ser consequência de uma única comparação entre atributos, mas sim da soma de dezenas de pequenas decisões tomadas durante o combate, aproximando a simulação da dinâmica real do Taekwondo.
