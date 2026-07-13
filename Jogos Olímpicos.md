# Jogos Olímpicos – Diretriz Oficial do Sistema

> **Versão:** 1.1  
> **Implementação Base:** Paris 2024  
> **Objetivo:** Definir o funcionamento dos Jogos Olímpicos dentro do simulador e estabelecer uma arquitetura flexível para futuros ciclos olímpicos.

---

# Introdução

Os Jogos Olímpicos representam o maior objetivo esportivo de qualquer atleta de taekwondo.

Nenhum outro torneio possui maior prestígio, importância histórica ou impacto na carreira de um atleta.

Todo o ecossistema competitivo do simulador existe para conduzir atletas e federações até este momento.

Classificar-se para os Jogos Olímpicos é considerado o principal objetivo da carreira de qualquer atleta presente no jogo.

Conquistar uma medalha olímpica representa o maior feito esportivo possível dentro do taekwondo.

---

# Frequência

Os Jogos Olímpicos acontecem a cada quatro anos.

O torneio encerra oficialmente um ciclo olímpico e inicia o planejamento do ciclo seguinte.

Exemplo:

- 2028 - Los Angeles-USA
- 2032
- 2036
- 2040

---

# Categorias Olímpicas

A implementação inicial utiliza exatamente as categorias dos Jogos Olímpicos de Paris 2024.

## Masculino

- -58 kg
- -68 kg
- -80 kg
- +80 kg

## Feminino

- -49 kg
- -57 kg
- -67 kg
- +67 kg

Caso a World Taekwondo ou o Comitê Olímpico Internacional alterem as categorias em futuras edições, essas alterações deverão ser realizadas apenas no arquivo de configuração do ciclo olímpico.

---

# Número de Atletas

Seguindo o modelo de Paris 2024:

- 16 atletas por categoria.

Total:

- 8 categorias
- 128 atletas

Caso esse número seja alterado em futuras Olimpíadas, o sistema deverá apenas atualizar a configuração do ciclo correspondente.

---

# Limite por País

No modelo utilizado em Paris 2024:

- cada país pode classificar apenas um atleta por categoria olímpica.

Assim, um país poderá possuir no máximo:

- 4 atletas masculinos;
- 4 atletas femininos.

Total máximo:

- 8 atletas.

Esse limite deve permanecer configurável para futuras edições.

---

# Filosofia do Sistema

A classificação olímpica não busca apenas reunir os melhores atletas do Ranking Mundial.

O objetivo é equilibrar:

- excelência esportiva;
- representatividade continental;
- diversidade de países;
- universalidade do esporte.

Por esse motivo existem diferentes formas de classificação.

---

# Sistema Base de Classificação (Paris 2024)

A implementação inicial do simulador seguirá exatamente o modelo utilizado para Paris 2024.

A ordem dos critérios deverá ser respeitada rigorosamente.

Sempre que um atleta conquistar uma vaga, ele será imediatamente removido de todas as etapas seguintes.

---

# Etapa 1 — Classificação pelo Ranking Olímpico

No ciclo de Paris 2024 classificaram-se diretamente:

- os 5 melhores atletas do Ranking Olímpico em cada categoria.

Foi considerada a publicação oficial do Ranking Olímpico publicado em janeiro de 2024 (ano da Olimpíada, no jogo será o ranking que será publicado na virada do ano Olímpico).

Após garantir vaga:

- o atleta deixa imediatamente o processo classificatório;
- não participa de seletivas continentais;
- não disputa novas vagas olímpicas.

---

# Etapa 2 — Torneios Classificatórios Continentais

Após remover os classificados pelo Ranking Olímpico, são disputados os torneios continentais.

No modelo de Paris 2024:

- África
- Ásia
- Europa
- Pan-América

Cada continente distribuiu a quantidade de vagas definida pela World Taekwondo para aquela edição.

Os atletas já classificados anteriormente não podem participar.

Assim que um atleta conquista sua vaga:

- ele deixa imediatamente o sistema classificatório.

---

# Etapa 3 — País-Sede

No ciclo de Paris 2024, a França possuía vagas reservadas como país-sede, respeitando as regras estabelecidas pelo Comitê Olímpico Internacional e pela World Taekwondo.

Essas vagas eram utilizadas apenas nas categorias em que o país ainda não tivesse conseguido classificação por outro critério.

O limite de um atleta por categoria permaneceu válido.

---

# Etapa 4 — Comissão Tripartite

As últimas vagas foram distribuídas pela Comissão Tripartite.

O objetivo foi ampliar a participação de países com menor tradição olímpica e fortalecer a universalidade do esporte.

Essas vagas seguiram critérios específicos definidos para Paris 2024.

---

# Remoção Automática dos Classificados

Este comportamento é obrigatório no sistema.

Sempre que um atleta conquistar vaga olímpica:

- ele será removido imediatamente de qualquer seletiva restante;
- sua vaga torna-se definitiva;
- ele não poderá disputar outra forma de classificação.

Exemplo:

Ranking Olímpico:

1. Coreia
2. Irã
3. Brasil
4. China
5. Turquia

Na seletiva asiática:

- Coreia não participa;
- Irã não participa;
- China não participa.

As vagas passam automaticamente para os demais atletas elegíveis.

---

# Limite Nacional

O limite de um atleta por categoria deve ser respeitado durante todo o processo classificatório.

Caso um país já possua um atleta classificado em determinada categoria:

- nenhum outro atleta daquele país poderá disputar novas vagas naquela categoria.

---

# Importância do Ranking Mundial

O Ranking Mundial influencia diretamente diversos aspectos da carreira.

Entre eles:

- classificação olímpica;
- posição como cabeça de chave;
- distribuição das chaves;
- prestígio internacional;
- reputação do atleta;
- oportunidades esportivas.

Manter uma boa posição no Ranking Mundial é um dos principais objetivos de qualquer atleta durante todo o ciclo olímpico.

---

# Objetivo Máximo da Carreira

Todo atleta existente no simulador possui um objetivo esportivo principal:

> Classificar-se para os Jogos Olímpicos.

Todas as decisões de carreira devem considerar esse objetivo.

Entre elas:

- calendário anual;
- escolha de torneios G;
- evolução técnica;
- mudança de categoria;
- recuperação física;
- planejamento de temporadas.

Conquistar uma medalha olímpica representa o maior reconhecimento possível dentro do esporte.

Da mesma forma, o desempenho olímpico é o principal indicador do sucesso de uma federação nacional.

Os Jogos Olímpicos constituem o evento mais importante de todo o calendário esportivo do simulador.

---

# Arquitetura do Sistema (Sem Hardcoded)

Toda a lógica olímpica deverá ser baseada em arquivos de configuração, nunca em valores fixos no código.

Cada ciclo olímpico deverá possuir sua própria configuração, permitindo alterações sem necessidade de modificar a lógica do simulador.

Exemplo:

```
/config/olympics/

2028.json
2032.json
2036.json
2040.json
```

Cada arquivo poderá definir, entre outros parâmetros:

- categorias olímpicas;
- quantidade de atletas por categoria;
- número máximo de atletas por país;
- ordem dos critérios de classificação;
- data oficial de fechamento do Ranking Olímpico;
- quantidade de classificados pelo Ranking Olímpico;
- continentes participantes das seletivas;
- número de vagas distribuídas por continente;
- regras do país-sede;
- regras da Comissão Tripartite;
- qualquer outro critério específico daquela edição.

Dessa forma, caso a World Taekwondo ou o Comitê Olímpico Internacional alterem o sistema de classificação em futuras Olimpíadas, será necessário apenas atualizar o arquivo de configuração do respectivo ciclo, sem realizar alterações na lógica do simulador.

Essa arquitetura garante maior fidelidade ao esporte real, facilita a manutenção do projeto e permite que o jogo acompanhe naturalmente futuras mudanças nas regras olímpicas.
