FROM node:22-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
# Vite 8 / rolldown ships per-platform native bindings as `optionalDependencies`.
# `npm ci` on alpine (musl) hits npm/cli#4828 and skips the right binding,
# producing a dist/ that crashes at startup (blank page in the browser).
# Using a glibc-based image plus an explicit --include=optional makes the
# build deterministic across CI and local runs.
RUN npm ci --no-audit --no-fund --include=optional
COPY . .
ENV NODE_ENV=production
ENV VITE_API_BASE_URL=https://cdm.coflnet.com \
	VITE_FIREBASE_API_KEY=AIzaSyC4CwoQjkqMUjTs09kbUU5JRGP1Y6Lc4bo \
	VITE_FIREBASE_AUTH_DOMAIN=cdm-project-466fd.firebaseapp.com \
	VITE_FIREBASE_PROJECT_ID=cdm-project-466fd \
	VITE_FIREBASE_STORAGE_BUCKET=cdm-project-466fd.firebasestorage.app \
	VITE_FIREBASE_MESSAGING_SENDER_ID=434778349668 \
	VITE_FIREBASE_APP_ID=1:434778349668:web:f5b308bfef51f0e90cff71 \
	VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwYnh1eHVxbmFhenF3bWFqYXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTA4NjYsImV4cCI6MjA5MjYyNjg2Nn0.-BNrrfdRUEiIISuxOES91rBwcmiBh7qTY8VvsffImKY \
	VITE_SUPABASE_URL=https://vpbxuxuqnaazqwmajaym.supabase.co
RUN npm run build

FROM nginx:1.27-alpine AS runtime
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
