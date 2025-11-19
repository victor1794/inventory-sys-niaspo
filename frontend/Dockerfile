FROM nginx:alpine

# Кладём наш nginx.conf внутрь контейнера
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем всю статику (index.html, app.js, style.css) в стандартную папку nginx
COPY . /usr/share/nginx/html
