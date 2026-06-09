FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["sh", "-c", "npm run migrate up && npm run start:dev"]
