FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG BASE_PATH=/
RUN npm run build -- --base="${BASE_PATH}"

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --chown=node:node server ./server
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "server/index.js"]
