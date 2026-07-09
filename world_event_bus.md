Documento de Arquitetura

World Event Bus

Versão: 1.0
Status: Diretriz de Arquitetura
Prioridade: Obrigatória

---

Objetivo

O World Event Bus é o sistema responsável pela comunicação entre todos os módulos do simulador.

Nenhum sistema deve chamar diretamente outro sistema para informar que algo aconteceu.

Em vez disso, todo acontecimento relevante deve ser publicado como um evento, permitindo que qualquer módulo interessado reaja sem criar dependências diretas.

O World Event Bus representa o "sistema nervoso" do simulador.

---

Filosofia

Os sistemas não conversam entre si.

Os sistemas publicam acontecimentos.

Os sistemas escutam acontecimentos.

Essa abordagem reduz o acoplamento e permite que novos módulos sejam adicionados sem alterar os já existentes.

---

Funcionamento

Fluxo geral:

Sistema A

↓

Publica Evento

↓

World Event Bus

↓

Entrega para todos os interessados

↓

Cada sistema decide como reagir

---

Exemplo

Ao terminar uma luta:

Combat Engine

↓

FightFinished

↓

World Event Bus

O Event Bus distribui automaticamente para:

Ranking System

Statistics System

News System

History System

Achievement System

Federation System

Save System

O Combat Engine nunca chama nenhum desses sistemas.

---

Responsabilidades

O Event Bus deve:

- registrar eventos;
- distribuir eventos;
- controlar ordem de entrega;
- permitir múltiplos ouvintes;
- impedir dependências diretas entre módulos.

O Event Bus não deve:

- conter regras de negócio;
- alterar entidades;
- decidir resultados;
- armazenar lógica permanente.

---

Estrutura de um Evento

Todo evento deve possuir informações mínimas.

Exemplo:

{
  "eventId": "...",
  "type": "FightFinished",
  "timestamp": "...",
  "worldDate": "...",
  "source": "...",
  "payload": { }
}

---

Campos Obrigatórios

Todo evento deve conter:

- Event ID
- Tipo
- Data simulada
- Horário da simulação
- Sistema de origem
- Dados do evento (payload)

---

Publicação

Todo sistema pode publicar eventos.

Exemplo:

Training System

↓

TrainingFinished

---

Recovery System

↓

AthleteRecovered

---

Competition System

↓

CompetitionStarted

---

Competition System

↓

CompetitionFinished

---

Ranking System

↓

RankingUpdated

---

Assinatura

Cada módulo informa quais eventos deseja receber.

Exemplo:

News System

Escuta:

FightFinished

CompetitionFinished

AthleteRetired

WorldRecordBroken

---

Ranking System

Escuta:

FightFinished

DisqualificationApplied

CompetitionFinished

---

Statistics System

Escuta:

Todos os eventos esportivos

---

Independência

Nenhum sistema conhece outro sistema.

Exemplo proibido:

Combat Engine

↓

RankingSystem.update()

Isso cria dependência.

O correto é:

Combat Engine

↓

FightFinished

↓

World Event Bus

↓

Ranking System reage

---

Ordem de Processamento

Eventos devem ser processados na ordem em que forem publicados.

O Event Bus deve garantir:

- ordem determinística;
- processamento único;
- ausência de duplicidade.

---

Eventos Oficiais

Mundo

- WorldCreated
- WorldLoaded
- WorldSaved
- NewDayStarted
- NewMonthStarted
- NewSeasonStarted

---

Atletas

- AthleteCreated
- AthleteRetired
- AthleteInjured
- AthleteRecovered
- AthleteSuspended
- AthletePromoted

---

Treinamento

- TrainingStarted
- TrainingFinished
- AttributeImproved

---

Competições

- CompetitionCreated
- CompetitionStarted
- CompetitionFinished
- DrawCompleted

---

Lutas

- FightStarted
- FightFinished
- Knockout
- GoldenPointStarted
- PenaltyApplied
- InjuryOccurred

---

Rankings

- RankingUpdated
- LeaderChanged

---

Federações

- FederationCreated
- CoachHired
- CoachFired
- AthleteSelected

---

Economia

- BudgetChanged
- SponsorshipSigned

---

Notícias

- NewsGenerated

---

Eventos em Cascata

Um evento pode gerar outros eventos.

Exemplo:

FightFinished

↓

RankingUpdated

↓

LeaderChanged

↓

NewsGenerated

↓

AchievementUnlocked

Cada sistema publica apenas seus próprios eventos.

Nunca publica eventos de responsabilidade de outro sistema.

---

Eventos Síncronos

Utilizar quando:

- a ordem importa;
- outro sistema depende do resultado imediatamente.

Exemplo:

FightFinished

↓

RankingUpdated

↓

Save

---

Eventos Assíncronos

Utilizar quando:

- apenas informativos;
- interface;
- estatísticas;
- notícias;
- telemetria.

Exemplo:

FightFinished

↓

NewsGenerated

---

Prioridades

Cada evento pode possuir prioridade.

Exemplo:

Alta

- FightFinished
- AthleteRetired
- CompetitionFinished

Média

- RankingUpdated
- TrainingFinished

Baixa

- NewsGenerated
- UIAnimationFinished

---

Persistência

Eventos não representam o estado do mundo.

Eventos representam apenas acontecimentos.

O estado oficial permanece armazenado nas entidades do mundo.

---

Benefícios

Esta arquitetura permite:

- módulos independentes;
- facilidade de testes;
- expansão contínua;
- reutilização de sistemas;
- baixo acoplamento;
- manutenção simples;
- melhor desempenho em projetos grandes.

---

Integração com o Simulation Director

O fluxo oficial do simulador deve ser:

Simulation Director

↓

Executa um sistema

↓

Sistema publica eventos

↓

World Event Bus distribui

↓

Demais sistemas reagem

↓

Simulation Director executa próximo sistema

O Simulation Director controla quando os sistemas executam.

O World Event Bus controla como os sistemas se comunicam.

Ambos trabalham em conjunto, mas possuem responsabilidades completamente distintas.

---

Princípios Obrigatórios

1. Nenhum sistema pode chamar diretamente outro sistema para informar acontecimentos.
2. Toda comunicação entre módulos deve ocorrer através do World Event Bus.
3. Eventos representam fatos consumados, nunca intenções.
4. Um evento nunca deve modificar diretamente outra entidade.
5. Cada sistema é responsável apenas por reagir aos eventos que lhe interessam.
6. Todo evento deve possuir identificador único, origem e data simulada.
7. O Event Bus deve garantir processamento determinístico e sem duplicidade.
8. Novos eventos podem ser adicionados sem alterar os sistemas existentes, desde que respeitem a estrutura oficial.

---

Objetivo Final

O World Event Bus deve transformar o simulador em uma arquitetura orientada a eventos (Event-Driven Architecture), permitindo que dezenas de sistemas independentes evoluam em conjunto sem criar dependências diretas. Essa abordagem garante alta escalabilidade, manutenção simplificada e facilita a incorporação de novos módulos ao longo da vida do projeto.
