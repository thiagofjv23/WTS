# Sistema de Rivalidades

Documento da mecânica de rivalidades entre atletas do simulador.

## Objetivo

Quando dois atletas se enfrentam repetidamente em fases decisivas (finais e
semifinais) — sobretudo em GRANDES eventos —, forma-se uma **rivalidade**. Rivais
entram com mais "gana": a luta fica mais **imprevisível** (o azarão cresce),
criando clássicos e narrativas ao longo das décadas.

A mecânica foi desenhada para dar **muito realismo com pouquíssimo dado**: não
guardamos o log de lutas antigas — apenas um agregado minúsculo por par.

---

## O dado (permanente e barato)

`world.rivalries` é um mapa `pairKey → registro`, onde `pairKey` é a chave
canônica do par (independe da ordem dos ids):

```js
world.rivalries["ATH-12|ATH-88"] = {
  aId, bId,
  meetings: 6,          // encontros decisivos contabilizados
  decisive: 6,
  h2h: { "ATH-12": 4, "ATH-88": 2 },  // retrospecto
  intensity: 68.1,      // acumulada, com peso por evento e decaimento
  lastDate: "2029-11-28",
  lastGRank: "G-10",
}
```

Só pares com rivalidade relevante ficam guardados (poda automática). Em ~5
temporadas isso dá ~550 registros ≈ **~90 KB** — desprezível e permanente.

---

## Como a rivalidade se forma (Consequence phase)

Após cada competição, `updateRivalriesFromCompetition` percorre apenas as lutas
**decisivas** (final e semifinal) e acumula intensidade:

```
peso = fatorRodada × fatorEvento
```

- **fatorRodada:** final = 3,0 · semifinal = 2,0. (Rodadas anteriores não criam
  rivalidade.)
- **fatorEvento = championPoints / 10** → G-1 = 1 · G-2 = 2 · G-4 = 4 · G-6 = 6 ·
  G-10 = 10 · Mundial G-14 = 14 · **Olimpíada G-20 = 20**.

Ou seja, **os grandes eventos pesam muito mais**: uma única final olímpica
(3 × 20 = 60) vale mais que 20 finais de G-1 (3 × 1 = 3 cada). Foi o pedido
explícito do projeto — rivalidades nascem principalmente onde vale mais.

### Constrói-se com o tempo (≥ 3 encontros decisivos)

Um par **só vira rivalidade** depois de **pelo menos 3 encontros decisivos**
(finais/semifinais) — `RIVALRY_MIN_MEETINGS = 3`. Antes disso o par está **"em
formação"**: o agregado é contabilizado (encontros, intensidade, retrospecto),
mas **não conta como rivalidade** — `rivalryIntensity` devolve 0, não afeta o
combate e não aparece na UI. "Uma rivalidade se constrói com o tempo": uma única
final, por maior que seja o evento, não basta.

### As Seletivas Nacionais também contam

Finais e semifinais das **Seletivas Nacionais** entram na mesma regra: dois
compatriotas que decidem a seletiva repetidamente (3+ vezes) constroem uma
rivalidade nacional. A seletiva usa peso de evento pequeno (dummy G-1 → fator 1),
então são necessários vários anos de finais nacionais — o que é justamente
"construir com o tempo".

A intensidade **esfria com o tempo** (meia-vida de 30 meses): se os dois não se
cruzam, a rivalidade decai e acaba podada (`MIN_INTENSITY`). Rivalidades vivas
são as reacesas por encontros recentes/importantes.

---

## Efeito no combate (a "gana")

No fluxo de um evento, antes de cada luta o Competition System consulta a
rivalidade **do par** (decaída até a data) e passa o nível (0..1) ao Combat
Engine. Se houver rivalidade, `simulateFight` aplica uma **perturbação aleatória
extra nos atributos de cada lado** (até ±8% no máximo de intensidade).

Como a perturbação é simétrica e independente para os dois, ela **não favorece
ninguém em média** — apenas **aumenta a variância**: o favorito tem mais chance
de ter um dia ruim e o azarão de crescer. É o "clássico imprevisível". Nenhum
atributo permanente é alterado (combat_framework.md: estados temporários).

A rivalidade é lida **por luta** (é uma propriedade do par), diferente da forma,
que é sorteada uma vez por atleta por evento.

---

## Onde entra no pipeline

```
Competition System (monta o campo)
   └─ para cada luta: consulta world.rivalries[par] → nível → Combat Engine
Combat Engine (aplica a variância extra)
   ↓
Consequence phase:
   updateRivalriesFromCompetition  (atualiza finais/semis deste evento)
   pruneRivalries                  (remove as que esfriaram)
```

A atualização é feita DEPOIS das lutas, então o **próximo** evento já usa o
estado novo (a rivalidade construída hoje influencia os confrontos de amanhã).
As **Seletivas Nacionais** rodam o mesmo par `updateRivalriesFromCompetition` +
`pruneRivalries` — apesar de não pontuarem no ranking, contam para as rivalidades.

---

## Na interface

- **Ficha do atleta:** seção **"Rivais"** com os principais rivais, o retrospecto
  (ex.: `4–2`), quantos encontros e o último grande palco. Chamas 🔥 indicam a
  intensidade. Clicável → abre a ficha do rival.
- **Tela de campeonato:** um selo 🔥 marca os confrontos que foram **duelos de
  rivais** (a rivalidade influenciou aquela luta).

---

## Parâmetros (calibração)

Em `src/engine/rivalry.js`:

| Constante | Valor | Papel |
|---|---|---|
| `ROUND_FACTOR` | final 3, semi 2 | importância da fase |
| `EVENT_DIVISOR` | 10 | peso do evento = championPoints/10 |
| `RIVALRY_MIN_MEETINGS` | 3 | encontros decisivos p/ VIRAR rivalidade |
| `HALF_LIFE_MONTHS` | 30 | rapidez com que a rivalidade esfria |
| `FULL_INTENSITY` | 40 | intensidade → nível 1.0 |
| `MIN_INTENSITY` | 4 | abaixo disto, o par decai e é podado |
| `RIVALRY_ATTR_STD` | 8 | variância extra no combate (%) |

Todos ajustáveis sem tocar em outros sistemas.

---

## Custo e relação com o save

O sistema **substitui** a necessidade de guardar lutas antigas para gerar
rivalidade: os agregados por par são minúsculos e permanentes. É a peça que
permite reduzir o histórico detalhado de lutas (ver poda de lutas no TODO) sem
perder a narrativa de rivalidades ao longo das décadas.
