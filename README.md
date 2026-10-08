# ClientFlow Pro

Crie um CRM simples, funcional e visualmente atrativo, voltado para consultores financeiros gerenciarem seus clientes de forma eficiente. O sistema deve oferecer duas visualizações principais: em tabela e em kanban, além de recursos extras para acompanhar renovações de contratos.

📋 VISUALIZAÇÃO 1: TABELA DE CLIENTES

Crie uma tabela dinâmica e editável com os seguintes campos:

Começo do contrato

Fim do contrato

Nome

Idade

E-mail

Telefone

Profissão

Objetivo

Prazo de investimentos

Patrimônio financeiro

Patrimônio material

Reserva de emergência

Perfil de investidor

Faturamento mensal

Aporte mensal

O que foi feito

Tarefas

Observações

Cidade

UF

Etapa do Funil (campo categórico)

Renovado? (sim/não)

Potencial para renovação? (sim/não)

A tabela deve permitir:

Edição inline de todos os campos

Filtros por nome, profissão, cidade, UF, etapa e status de renovação

Busca global rápida

Ordenação por data de criação, fim de contrato e faturamento mensal

🗂 VISUALIZAÇÃO 2: KANBAN DE ETAPAS DO FUNIL

Organize os clientes em colunas do funil com as seguintes etapas:

Novo cliente

Em atendimento

1ª Reunião agendada

2ª Reunião agendada

3ª Reunião agendada

4ª Reunião agendada

5ª Reunião agendada

6ª Reunião agendada

Conclusão

Recursos do Kanban:

Cards com nome, objetivo, etapa atual, próximos passos e status de tarefas

Drag-and-drop entre etapas

Marcação de tarefas concluídas

Indicadores visuais (ex: ícones ou cor de borda) para clientes com renovação ativa ou potencial de renovação

⚙️ FUNCIONALIDADES ESSENCIAIS

CRUD completo: criar, visualizar, editar e excluir clientes

Busca e filtros avançados

Adição de observações rápidas

Responsivo para desktop e mobile

Exportação de dados (CSV de leads)

Indicadores no topo: total de clientes, total em atendimento, total de renovações

🎨 DESIGN E ESTILO

Paleta de cores: Azul predominante (#3B82F6, #E0F2FE), com branco para fundo e botões em laranja para ações principais

Tipografia moderna e clara

Interface tipo dashboard, com abas (tabs) para alternar entre Tabela e Kanban

Botões arredondados, ícones suaves e layout intuitivo

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://finhub-connect-78.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/deeca564-47f8-41b0-9377-28804c48eb94).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
