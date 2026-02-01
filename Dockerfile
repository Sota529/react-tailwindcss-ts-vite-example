FROM node:22-alpine

# pnpm環境変数を設定
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Corepackを有効化してpnpmをインストール
RUN corepack enable

WORKDIR /app

# 依存関係ファイルを先にコピー（キャッシュ活用）
COPY package.json pnpm-lock.yaml ./

# pnpmストアのキャッシュマウントを使用して依存関係をインストール
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ソースコードをコピー
COPY . .

# 開発サーバー起動
CMD ["pnpm", "run", "dev", "--", "--host"]
