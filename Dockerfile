FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_ENV=production
RUN npm run build

ENV VITE_API_BASE_URL=https://cdm.coflnet.com \
VITE_FIREBASE_API_KEY=AIzaSyC4CwoQjkqMUjTs09kbUU5JRGP1Y6Lc4bo\
VITE_FIREBASE_AUTH_DOMAIN=cdm-project-466fd.firebaseapp.com\
VITE_FIREBASE_PROJECT_ID=cdm-project-466fd\
VITE_FIREBASE_STORAGE_BUCKET=cdm-project-466fd.firebasestorage.app\
VITE_FIREBASE_MESSAGING_SENDER_ID=434778349668\
VITE_FIREBASE_APP_ID=1:434778349668:web:f5b308bfef51f0e90cff71\
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwYnh1eHVxbmFhenF3bWFqYXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTA4NjYsImV4cCI6MjA5MjYyNjg2Nn0.-BNrrfdRUEiIISuxOES91rBwcmiBh7qTY8VvsffImKY\
VITE_SUPABASE_URL=https://vpbxuxuqnaazqwmajaym.supabase.co

FROM nginx:1.27-alpine AS runtime
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
