FROM node:22-alpine AS build

ARG APP_PATH
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY cli ./cli

RUN corepack enable \
  && corepack pnpm install --prod=false --frozen-lockfile \
  && corepack pnpm --filter "./${APP_PATH}" build

FROM node:22-alpine AS runtime

ARG APP_PATH
WORKDIR /workspace/${APP_PATH}
ENV NODE_ENV=production

COPY --from=build /workspace /workspace

USER node

CMD ["node", "dist/server.js"]
