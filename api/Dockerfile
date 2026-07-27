FROM node:22-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["sh", "-c", "npm run migrate up && npm run start:dev"]

FROM dev AS build
RUN npm run build

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
EXPOSE 3001
# Call the migrate binary directly and exec node so it runs as PID 1 and
# receives SIGTERM from docker stop without waiting for the kill timeout.
CMD ["sh", "-c", "node_modules/.bin/node-pg-migrate --migrations-dir migrations up && exec node dist/main"]
