FROM node:20-alpine

WORKDIR /app/frontend

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

ENV BACKEND_URL=http://backend:8000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
