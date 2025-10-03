FROM nginx:alpine

# Copiar configuração customizada
COPY nginx.conf /etc/nginx/nginx.conf

# Criar diretórios necessários
RUN mkdir -p /var/log/nginx /usr/share/nginx/html/static

# Copiar página de erro customizada (opcional)
COPY html/ /usr/share/nginx/html/ 2>/dev/null || true

# Expor porta
EXPOSE 80

# Comando padrão
CMD ["nginx", "-g", "daemon off;"]