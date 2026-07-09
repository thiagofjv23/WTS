Documento 3:
Diretrizes Tecnológicas e de Desenvolvimento

Filosofia

O projeto deve priorizar código simples, legível e altamente organizado. A clareza da arquitetura é mais importante do que o uso de tecnologias complexas.

---

Linguagens

HTML5

Responsável pela estrutura da interface.

Não deve conter lógica de negócio.

---

CSS3

Responsável exclusivamente pela apresentação.

Utilizar:

- Flexbox;
- CSS Grid;
- Variáveis CSS;
- Media Queries;
- Animações leves.

Evitar estilos inline.

---

JavaScript ES2023

Responsável por toda a lógica da aplicação.

Utilizar módulos ES (import/export).

Evitar variáveis globais.

Preferir:

- const
- let
- classes quando fizer sentido
- funções puras
- objetos imutáveis sempre que possível

---

Estrutura Modular

Cada arquivo deve possuir uma única responsabilidade.

Exemplos:

athlete.service.js

competition.service.js

ranking.service.js

calendar.service.js

history.service.js

simulation.engine.js

eventBus.js

---

Padrões de Projeto

Os seguintes padrões deverão ser adotados:

- Module Pattern
- Service Layer
- Observer Pattern (Event Bus)
- Repository Pattern (para acesso aos dados)
- Factory Pattern (criação de entidades)
- Strategy Pattern (diferentes regras de simulação)
- Command Pattern (ações do usuário, como avançar o tempo)
- State Pattern (estados do simulador, como carregando, simulando e pausado)

O uso de padrões deve ocorrer apenas quando simplificar a manutenção do código, evitando complexidade desnecessária.

---

Convenções

Arquivos:

camelCase.

Classes:

PascalCase.

Constantes:

UPPER_SNAKE_CASE.

IDs:

imutáveis.

Datas:

ISO-8601.

---

Comunicação

Toda comunicação entre módulos ocorrerá através do Event Bus.

Nunca chamar diretamente módulos não relacionados.

---

Performance

Objetivos:

- carregamento inicial rápido;
- baixo uso de memória;
- simulação eficiente mesmo com milhares de atletas e décadas de histórico.

Sempre que possível, processar apenas os dados necessários para cada avanço de tempo.

---

Compatibilidade

O sistema deve funcionar em:

- Android (Chrome e WebView);
- navegadores modernos para desktop.

A interface deve ser responsiva e adaptada ao uso por toque, sem depender de recursos exclusivos de computadores.

---

Qualidade de Código

Todo código deverá ser:

- documentado quando necessário;
- modular;
- reutilizável;
- testável;
- previsível;
- sem duplicação de lógica.

Nenhum módulo deve ultrapassar responsabilidades claramente definidas.

A arquitetura deve permanecer consistente durante toda a evolução do projeto, garantindo que novas funcionalidades sejam incorporadas por extensão, e não por reescrita da base existente."
