# React Tailwindcss TS Vite Example

## 使用技術

このプロジェクトは以下のツールを使用しています

- [Vite](https://vitejs.dev)
- [ReactJS](https://reactjs.org)
- [TypeScript](https://www.typescriptlang.org)
- [Vitest](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Tailwindcss](https://tailwindcss.com)
- [Eslint](https://eslint.org)
- [Prettier](https://prettier.io)

### pnpm のインストール

このプロジェクトはパッケージマネージャーとして [pnpm](https://pnpm.io/ja/) を使用しています。

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

## Docker を使用した開発環境起動

開発モードで <http://localhost:5173> にてサーバーを起動します
初回またはDockerfileを変更した場合：

```bash
docker compose up --build
```

2回目以降：
```bash
docker compose up
```

バックグラウンドで起動する場合：

```bash
docker compose up -d
```

停止：

```bash
docker compose down
```

## ローカル環境での起動

### 依存関係のインストール

```bash
pnpm install
```

### 開発サーバーの起動

<http://localhost:5173> にてサーバーを起動します。

```bash
pnpm run dev
```

### Lint

```bash
pnpm run lint
```

### 型チェック

```bash
pnpm run typecheck
```

### ビルド

```bash
pnpm run build
```

### テスト

```bash
pnpm run test
```

UI でテストを確認・操作できます。

```bash
pnpm run test:ui
```
