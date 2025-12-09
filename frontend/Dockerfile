FROM nginx:alpine

# Кладём наш конфиг
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем index.html
COPY index.html /usr/share/nginx/html/index.html

# Копируем статику css/js
COPY static /usr/share/nginx/html/static
