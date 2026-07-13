# AGOPS Kanban

App desktop corporativo (Electron + React + TanStack) para gestão de tarefas em quadro
Kanban por prioridade. Dados 100% locais (IndexedDB), sem servidor.

## Recursos

- **Quadro Kanban** com 4 colunas de prioridade — **Urgente → Alta → Média → Baixa** (mais
  urgente à esquerda). Cada coluna é uma fila: o topo é a próxima a ser feita.
- **Adição rápida** estilo Trello (digite o título e Enter em cada coluna).
- **Drag & drop** vertical (reordena a fila) e horizontal (muda a prioridade).
- **Tarefas** com título, descrição, data de criação. A **data de fim** é definida ao
  **Concluir** — a tarefa sai do quadro e passa a alimentar os resumos.
- **Múltiplos projetos** (seletor no topo).
- **Resumos** por **Dia / Semana / Mês** com base na data de conclusão (por prioridade,
  por projeto e lista das concluídas).
- **Notas** em Markdown, com toggle **Editar / Ler** e **exportação .md**.
- **Tema claro** (padrão corporativo) com **toggle** para escuro.

## Requisitos

- Node.js 18+.

## Desenvolvimento

```bash
npm install
npm run dev
```

> `npm install` baixa o binário do Electron. Se estiver atrás de proxy/rede restrita e o
> download não ocorrer, rode `node node_modules/electron/install.js`.

## Build

Gera os bundles de main/preload/renderer em `out/`:

```bash
npm run build
```

## Empacotamento portátil (Windows)

Empacotamento não versionado — feito localmente:

```bash
npx electron-builder --win dir
```

Saída em `release/` (app descompactado). A configuração de empacotamento está em
`electron-builder.yml` (também há um alvo `portable` para gerar um `.exe` único).

## Onde ficam os dados

O IndexedDB é armazenado no diretório de dados do usuário do Electron
(`%APPDATA%/AGOPS Kanban` no Windows).

## Stack

electron-vite · Electron 42 · electron-builder 26 · React 18 · TypeScript ·
@tanstack/react-router · @tanstack/react-query · Dexie (IndexedDB) · @dnd-kit ·
react-markdown + remark-gfm · date-fns.
