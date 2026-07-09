Documento de Arquitetura

Random System

Versão: 1.0
Status: Diretriz de Arquitetura
Prioridade: Obrigatória

---

Objetivo

O Random System é o sistema responsável por controlar toda a aleatoriedade existente no simulador.

Ele garante que eventos probabilísticos sejam:

- realistas;
- equilibrados;
- reproduzíveis;
- auditáveis;
- consistentes entre diferentes simulações.

Nenhum sistema do simulador deve utilizar funções aleatórias diretamente.

Toda geração de aleatoriedade deve passar pelo Random System.

---

Filosofia

A aleatoriedade de um simulador esportivo não deve significar caos.

Ela deve representar:

- incerteza esportiva;
- variações humanas;
- momentos inesperados;
- fatores externos.

Um atleta favorito deve possuir maior chance de vitória, mas nunca garantia absoluta.

Um atleta inferior pode vencer devido a:

- estratégia;
- preparação;
- momento psicológico;
- erro adversário;
- fator surpresa.

---

Responsabilidade Principal

O Random System deve:

- gerar números aleatórios;
- controlar sementes (seeds);
- permitir reprodução de simulações;
- fornecer distribuições probabilísticas;
- registrar resultados quando necessário.

O Random System não deve:

- decidir vencedores;
- possuir regras de luta;
- alterar atributos;
- definir resultados esportivos.

Ele apenas fornece ferramentas matemáticas para outros sistemas.

---

Arquitetura

Sistema

↓

Solicita aleatoriedade

↓

Random System

↓

Retorna valor probabilístico

↓

Sistema utiliza dentro da própria regra

---

Exemplo

O Combat Engine não deve fazer:

Math.random()

O correto:

Combat Engine

↓

RandomSystem.getProbability()

↓

Resultado

---

Seed (Semente)

Toda simulação deve possuir uma seed inicial.

Exemplo:

Seed:
84937291

Essa seed controla toda a sequência de números aleatórios.

Com a mesma seed e o mesmo estado inicial:

Resultado A

=

Resultado B

---

Benefícios da Seed

Permite:

Reprodução de bugs

Se uma luta gerar um resultado estranho:

Guardar:

Seed:
123456

Atletas:
A vs B

Data:
2030-05-20

A equipe consegue reproduzir exatamente o problema.

---

Compartilhamento de simulações

Dois usuários podem executar:

Mesmo mundo

Mesma seed

Mesmo resultado

---

Testes automatizados

Permite testar:

- 1000 campeonatos;
- diferentes cenários;
- equilíbrio das regras.

---

Tipos de Aleatoriedade

O sistema deve oferecer diferentes modelos.

---

1. Uniform Distribution

Probabilidade igual.

Exemplo:

Sorteio de:

- chaveamento;
- número aleatório;
- evento simples.

---

2. Weighted Random

Aleatoriedade com peso.

Exemplo:

Atleta A:

70% chance

Atleta B:

30% chance

Não significa vitória garantida.

---

3. Normal Distribution

Distribuição baseada em média.

Usada para:

- evolução de atletas;
- geração de talentos;
- variação física.

---

4. Gaussian Variation

Pequenas variações ao redor de um valor.

Exemplo:

Atleta possui:

Velocidade:
85

Resultado diário:

84.2

86.1

85.4

---

5. Extreme Events

Eventos raros.

Exemplo:

- zebra histórica;
- lesão grave;
- revelação inesperada;
- queda de rendimento.

Devem possuir baixa frequência.

---

Uso no Combat Engine

O Random System pode fornecer:

Chance de golpe acertar

Chance de defesa funcionar

Chance de penalidade

Chance de lesão

Chance de virada

Mas nunca:

"Atleta A vence".

---

Uso no Desenvolvimento de Atletas

Exemplo:

Treino:

Base:

+0.05 técnica

Random:

±0.03

Resultado:

+0.07

---

Uso na Geração de Novos Atletas

Ao criar um jovem atleta:

O sistema gera:

- talento;
- atributos iniciais;
- potencial;
- personalidade;
- estilo.

Exemplo:

{
"speed":72,
"technique":78,
"potential":91,
"discipline":65
}

---

Uso em Eventos Mundiais

Exemplos:

Possíveis eventos:

- mudança de treinador;
- crise financeira;
- novo talento;
- aposentadoria precoce;
- escândalo.

Cada evento possui probabilidade configurável.

---

Controle de Aleatoriedade

O sistema deve possuir modos diferentes.

---

Modo Simulação

Aleatoriedade completa.

Usado no jogo normal.

---

Modo Teste

Seed fixa.

Usado por desenvolvedores.

---

Modo Histórico

Permite recriar cenários conhecidos.

Exemplo:

"Simular Jogos Olímpicos de 2028 usando a mesma configuração".

---

Registro de Aleatoriedade

Eventos importantes devem poder registrar:

{
"event":"FightFinished",
"seed":"84937291",
"randomValues":[
0.73,
0.42,
0.91
]
}

Isso permite auditoria.

---

Integração com Simulation Director

Fluxo:

Simulation Director

↓

Executa sistema

↓

Sistema solicita aleatoriedade

↓

Random System responde

↓

Sistema processa resultado

↓

Evento publicado no World Event Bus

---

Integração com World Event Bus

O Random System pode publicar:

- RandomSeedCreated
- SimulationReplayCreated
- ProbabilityCalculated

Porém, eventos internos de baixa importância não devem poluir o Event Bus.

---

Regras Obrigatórias

1. Nenhum módulo pode utilizar gerador aleatório próprio.
2. Toda aleatoriedade passa pelo Random System.
3. Toda simulação possui uma seed.
4. Resultados devem ser reproduzíveis.
5. Aleatoriedade nunca substitui lógica esportiva.
6. Favoritos devem ter vantagem probabilística, não certeza.
7. Eventos raros devem possuir frequência controlada.
8. O sistema deve permitir auditoria de resultados importantes.

---

Objetivo Final

O Random System deve criar uma camada de incerteza controlada, permitindo que o simulador produza histórias esportivas imprevisíveis, mas coerentes.

Ele deve ser capaz de gerar:

- campeões inesperados;
- rivalidades históricas;
- grandes viradas;
- talentos desconhecidos;
- narrativas únicas;

sem transformar o mundo simulado em uma sequência aleatória sem lógica.
