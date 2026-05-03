FROM node:25-alpine AS build

ARG APP_PATH
WORKDIR /workspace

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY ${APP_PATH}/package.json ${APP_PATH}/tsconfig.json ./${APP_PATH}/
COPY ${APP_PATH}/src ./${APP_PATH}/src

RUN corepack enable && corepack pnpm install --prod=false --frozen-lockfile=false && corepack pnpm --filter "./${APP_PATH}" build

FROM node:25-alpine AS runtime

ARG APP_PATH
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /workspace/${APP_PATH}/dist ./dist

CMD ["node", "dist/server.js"]
