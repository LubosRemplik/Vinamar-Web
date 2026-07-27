FROM node:22-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dev AS build
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
# Standalone output carries its own traced node_modules and next.config.mjs.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# content/ is read via process.cwd() at request time, so tracing can't see it.
COPY --from=build /app/content ./content
EXPOSE 3000
# node as PID 1 (no npm wrapper) so SIGTERM stops the container immediately.
CMD ["node", "server.js"]
