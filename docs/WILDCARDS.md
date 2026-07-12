# Wildcards da President's Cup

Documento da mecânica de vagas extras (wildcards) que a President's Cup concede
para o Campeonato Continental.

## Objetivo

No mundo real, cada **President's Cup** (dividida por continente) dá ao seu
vencedor uma **vaga direta** para o **Campeonato Continental** daquele continente.
Como o continental leva **apenas 1 representante por país** (o melhor ranqueado de
cada país naquele peso), o **wildcard é a ÚNICA maneira de um país ter DOIS
atletas** no continental.

Decisão de escopo (facilidade para o observador): as President's Cups são
**fechadas ao continente** — só lutam atletas daquele continente. (Já era assim no
código; ver `eligibility.js`.) Assim o agraciado é sempre elegível ao continental.

---

## Quem recebe a vaga

O agraciado é definido pela **ordem de classificação** da President's Cup:

1. **Campeão.**
2. Se o campeão **já é o nº 1 do seu país** (ou seja, já entraria no continental
   como representante nacional), a vaga **passa ao vice**.
3. Se o vice também é o nº 1 do seu país, passa ao **3º que perdeu para o
   campeão**, e assim por diante — **até achar um atleta que não seja o nº 1 do
   seu país** (que, portanto, não entraria de outra forma).

"Ser o nº 1 do país" é avaliado **no momento do continental** (contra o ranking
mensal vigente), pois é isso que define o representante nacional daquele evento.

### Ordem entre empates de colocação
Numa chave de eliminação simples há dois bronzes (semifinalistas). Para honrar "o
3º **que perdeu para o campeão**", desempatamos a mesma colocação por **quem foi
eliminado pelo atleta mais bem colocado** (quem perdeu para o campeão vem antes de
quem perdeu para o vice). Generaliza para todas as fases.

---

## Ciclo (quando vale)

No calendário real as President's Cups acontecem **depois** dos continentais do
mesmo ano, então o wildcard vale para o continental **seguinte** (do ano que vem):

```
President's Cup - Europe (jun/2026)  ──►  European Championships (mai/2027)
```

- **Concessão:** ao fim da President's Cup, guarda-se em `world.wildcards` um
  registro por categoria com a ordem de classificação (ids).
- **Uso:** ao montar um continental, resolve-se o agraciado (a partir das
  wildcards pendentes daquele continente/categoria com data anterior ao evento) e
  ele entra **além** do limite de 1 por país.
- **Consumo:** rodado o continental, as wildcards pendentes daquele continente são
  removidas (tiveram sua vez). Há também uma poda de segurança por idade (~1 ano).

Se **todos** os classificados da President's Cup já forem os nº 1 dos seus países,
a vaga não é usada (raro).

---

## O dado (barato e transitório)

```js
world.wildcards = [
  {
    continent: "EUR",
    categoryId: "WC-M-58",
    sourceCompetitionId: "COMP-…",
    sourceName: "WT President's Cup - Europe",
    date: "2026-06-06",              // quando foi conquistada
    candidates: ["ATH-1","ATH-2",…], // ordem de classificação da Copa
  },
]
```

E no evento continental, o registro do agraciado (para a UI e histórico):

```js
competition.wildcards = { "WC-M-58": ["ATH-199"] };
```

As wildcards são consumidas/expiradas em ~1 ano — **não acumulam**.

---

## Onde entra no pipeline

```
President's Cup termina:
   grantPresidentsCupWildcards  → empilha as vagas (por categoria)
Continental (ao montar o campo):
   wildcardEntrantsFor          → resolve o agraciado (não-rep. nacional)
   Participation                → entra ALÉM do 1 por país
Continental termina:
   consumeWildcards             → remove as pendentes do continente
```

Tudo determinístico (baseado no ranking mensal vigente e na ordem de
classificação da Copa).

---

## Na interface

Na tela do campeonato continental, o atleta que entrou pela vaga extra recebe um
selo **WC** (verde) ao lado do nome — tanto no **campo projetado** (antes) quanto
na **classificação final** (depois). Passa o mesmo recado do mundo real: "este
atleta está aqui pela vaga da President's Cup".

---

## Parâmetros

Em `src/engine/wildcards.js`:

| Constante | Valor | Papel |
|---|---|---|
| `MAX_AGE_DAYS` | 450 | validade de segurança de um wildcard não consumido |

A detecção de President's Cup / continental e a trava de continente vivem em
`src/engine/eligibility.js` (reutilizadas aqui).
