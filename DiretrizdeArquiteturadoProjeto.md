
Diretriz de Arquitetura do Projeto

Simulador de Ecossistema Mundial de Taekwondo

Versão: 1.0
Status: Documento de Diretrizes

---

Objetivo

Este documento define as diretrizes arquiteturais do projeto.

Estas diretrizes devem ser consideradas obrigatórias durante todo o desenvolvimento do simulador.

O objetivo principal é criar um projeto extremamente organizado, escalável, modular e fácil de manter, permitindo que novas funcionalidades sejam adicionadas durante anos sem necessidade de grandes refatorações.

A prioridade é sempre a qualidade da arquitetura antes da velocidade de implementação.

---

Filosofia do Projeto

Este NÃO é um jogo tradicional.

Também NÃO é um RPG.

Também NÃO é um simulador de carreira.

O projeto é um Simulador de Ecossistema Mundial de Taekwondo, onde o usuário acompanha a evolução do esporte ao longo das décadas.

Todo o código deve ser pensado para simular um mundo vivo.

---

Tecnologias

O projeto utilizará exclusivamente tecnologias web.

- HTML5
- CSS3
- JavaScript (ES Modules)

Não utilizar frameworks (React, Vue, Angular etc.) na versão inicial.

O objetivo é manter o projeto leve, portátil e facilmente executável em navegadores e dispositivos Android.

---

Plataforma Prioritária

Toda decisão de desenvolvimento deve considerar como plataforma principal:

Android (Mobile First)

Posteriormente o projeto poderá ser executado em computadores sem alterações significativas.

---

Filosofia Mobile First

Toda interface deverá nascer pensando primeiro em telas pequenas.

Prioridades:

- Interface limpa.
- Botões grandes.
- Rolagem vertical.
- Poucos pop-ups.
- Poucas telas.
- Navegação rápida.
- Boa utilização com apenas um dedo.
- Boa performance em celulares intermediários.

---

Separação Absoluta entre Interface e Simulação

Esta é uma regra obrigatória.

A interface nunca deverá conter lógica de simulação.

A interface apenas exibe informações.

Toda a lógica do jogo deverá existir dentro do motor de simulação.

A interface nunca deve alterar diretamente dados do mundo.

Toda alteração deverá passar pelo motor.

---

Arquitetura Baseada em Sistemas

O projeto deverá ser dividido em sistemas independentes.

Exemplos:

- Sistema de Geração
- Sistema de Evolução
- Sistema de Combate
- Sistema de Torneios
- Sistema de Rankings
- Sistema de Lesões
- Sistema de Notícias
- Sistema de Estatísticas
- Sistema de Aposentadoria
- Sistema de Seleções
- Sistema de Salvamento

Cada sistema deve possuir responsabilidades bem definidas.

Um sistema nunca deverá assumir responsabilidades pertencentes a outro.

---

Arquitetura Inspirada em ECS

Os dados deverão ser separados em componentes.

Evitar objetos gigantes contendo dezenas de atributos misturados.

Exemplo:

Atleta

↓

Componentes:

- Identidade
- Dados físicos
- Dados técnicos
- Dados mentais
- Carreira
- Estatísticas
- Ranking
- Histórico
- Lesões

Essa organização facilita futuras expansões.

---

Máquina de Estados

O jogo deverá funcionar utilizando estados claros.

Exemplo:

Menu

↓

Carregamento

↓

Simulação

↓

Pausa

↓

Visualização de competição

↓

Visualização de atleta

↓

Configurações

Nunca permitir que múltiplos estados incompatíveis existam simultaneamente.

---

Comunicação por Eventos

Sempre que possível, utilizar um sistema de eventos.

Exemplo:

Luta encerrada

↓

Evento emitido

↓

Sistema de Rankings recebe

↓

Sistema de Estatísticas recebe

↓

Sistema de Notícias recebe

↓

Sistema de Histórico recebe

Isso reduz o acoplamento entre módulos.

---

Componentização da Interface

Toda interface deverá ser composta por componentes reutilizáveis.

Exemplos:

- Card de atleta
- Card de país
- Card de competição
- Card de notícia
- Card de ranking
- Modal padrão
- Barra superior
- Barra inferior
- Painéis

Evitar duplicação de código.

---

Organização do Código

Organização sugerida:

/src
│
├── engine/
│   ├── simulation.js
│   ├── combat.js
│   ├── generation.js
│   ├── aging.js
│   ├── injuries.js
│   ├── rankings.js
│   ├── tournaments.js
│   ├── selection.js
│   ├── news.js
│   └── history.js
│
├── database/
│
├── ui/
│   ├── panels/
│   ├── cards/
│   ├── modals/
│   ├── pages/
│   └── layouts/
│
├── services/
│   ├── storage.js
│   ├── random.js
│   ├── events.js
│   ├── logger.js
│   └── utilities.js
│
├── styles/
│
└── main.js

---

Banco de Dados

Inicialmente utilizar arquivos JSON.

Exemplos:

- countries.json
- athletes.json
- clubs.json
- competitions.json
- rankings.json
- rules.json
- names.json

Persistência local utilizando localStorage.

A arquitetura deve permitir futura migração para IndexedDB ou banco remoto sem necessidade de reescrever o motor.

---

Organização do Motor

O motor deverá funcionar em ciclos.

Exemplo:

Atualizar idade

↓

Atualizar evolução

↓

Atualizar lesões

↓

Atualizar seleções

↓

Executar calendário

↓

Simular competições

↓

Atualizar rankings

↓

Gerar notícias

↓

Atualizar Hall da Fama

↓

Salvar mundo

Toda simulação deve seguir esse fluxo.

---

Responsabilidades

Cada arquivo deve possuir apenas uma responsabilidade.

Evitar arquivos com milhares de linhas contendo diversos sistemas misturados.

Sempre preferir arquivos pequenos e especializados.

---

Escalabilidade

Toda implementação deve considerar que futuramente existirão:

- milhares de atletas;
- centenas de países;
- décadas de histórico;
- milhares de competições simuladas;
- milhões de registros estatísticos.

Nunca desenvolver soluções pensando apenas no cenário inicial.

---

Performance

Evitar:

- loops desnecessários;
- renderizações completas da interface;
- cálculos repetidos;
- duplicação de dados.

Sempre preferir algoritmos eficientes.

A simulação deve continuar rápida mesmo após dezenas de temporadas.

---

Legibilidade

O código deve ser autoexplicativo.

Priorizar:

- nomes claros;
- funções pequenas;
- comentários úteis;
- módulos independentes;
- organização consistente.

---

Filosofia de Crescimento

O projeto deverá crescer em camadas.

Primeiro:

- motor;
- entidades;
- simulação;
- persistência.

Depois:

- interface;
- estatísticas;
- gráficos;
- filtros;
- melhorias visuais.

Nunca construir funcionalidades complexas sobre uma base instável.

---

Regra Fundamental

Sempre priorizar:

Organização > Velocidade

Escalabilidade > Solução rápida

Modularidade > Código monolítico

Legibilidade > Inteligência excessiva

O projeto deverá permanecer compreensível e expansível durante todo o seu ciclo de desenvolvimento."
