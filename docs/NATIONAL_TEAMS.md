# Seleções Nacionais e Seletivas

Documento da mecânica de Seletivas Nacionais e Seleção Nacional.

## Objetivo

Em **janeiro**, todo país com **mais de 20 atletas no total** realiza uma
**Seletiva Nacional** — um torneio interno, por categoria, entre os atletas do
próprio país. Em cada categoria:

- os **dois finalistas** (campeão e vice) entram na **Seleção Nacional**
  (titulares);
- os **dois terceiros colocados** ficam como **reservas** — entram na seleção
  (viram titulares) quando um titular se **lesiona**.

A Seleção é um destaque **observacional**: os atletas convocados são marcados em
todas as telas onde aparecem.

---

## Como funciona

### Agendamento (`scheduleNationalSelectives`)
No início de cada temporada, uma Seletiva por país elegível é criada e
**espalhada pelos dias de janeiro** (dias 3–29). Cada seletiva cobre as
categorias em que o país tem atletas. Janeiro estava livre no calendário real
(os eventos oficiais começam em fevereiro), então as seletivas o preenchem.

### Campo e resultado
O campo da seletiva são os **atletas do próprio país** naquela categoria (os
melhores por ranking, até 32). As lutas rodam pelo Combat Engine normal — com
forma e zebras —, então **um top do ranking pode ficar de fora da seleção** se
tropeçar (é o drama da seletiva).

### Seleção (`assignNationalTeam`)
Da classificação: 1º/2º → **titulares**; os dois 3º → **reservas**. A designação
do ano anterior daquele país/categoria é limpa (a seletiva é anual).

### Reserva convocado (`promoteReserveOnInjury`)
Quando um **titular** se lesiona (em qualquer evento oficial), o **primeiro
reserva ativo** do mesmo país/categoria é convocado e vira titular. Gera uma
notícia de **convocação** no feed.

---

## O que a seletiva NÃO faz

Para não distorcer o ecossistema, a Seletiva é **interna**:

- **não pontua no ranking** (nenhum ponto no ledger);
- **não conta medalhas nem estatísticas** de país;
- **não entra no histórico permanente** dos atletas.

Ela só determina a Seleção e fica visível no calendário/tela do evento. A
Seleção Nacional é, por ora, apenas uma **marcação** — não altera quem disputa
os continentais (isso segue pelo ranking + wildcard).

---

## O dado

```js
world.nationalTeams["KOR"]["WC-M-58"] = {
  titulares: ["ATH-1", "ATH-2"],
  reservas:  ["ATH-3", "ATH-4"],
  year: 2026,
  competitionId: "COMP-…",
};
```

E em cada atleta, para consulta rápida da UI:

```js
athlete.nationalTeam = "titular" | "reserva" | null;
```

A competição da seletiva é marcada com `type: "selective"` e
`selectiveCountry: "KOR"`.

---

## Na interface

O atleta da Seleção recebe um selo **SN** ao lado do nome em **todas** as telas:
ranking, ficha do atleta, tela de campeonato (campo e classificação), país,
favoritos/busca, notícias e a tela de fim de ano. O selo é **cheio** para
titular e **contornado (tracejado)** para reserva.

A tela do evento mostra a seletiva como **"Seletiva Nacional — {País}"** com o
selo *Seletiva* (sem pontuação de campeão), a classificação final (com os selos
SN) e o chaveamento.

Notícias: quando um reserva é convocado após lesão de um titular, sai um card
**CONVOCADO** ("convocado à Seleção Nacional no lugar de …").

---

## Parâmetros

Em `src/engine/nationalTeams.js`:

| Constante | Valor | Papel |
|---|---|---|
| `SELECTIVE_MIN_ATHLETES` | 20 | país precisa de MAIS de 20 atletas |
| `SELECTIVE_FIELD` | 32 | máximo de inscritos por categoria na seletiva |

---

## Custo

As seletivas rodam só o bracket + a designação (pulam pontos/estatísticas/
histórico/lesões), então o custo é baixo: ~40 seletivas por ano adicionam
≈ 35 ms/ano ao tempo de simulação (medido). ~20% do plantel fica marcado como
Seleção Nacional (titulares + reservas).
