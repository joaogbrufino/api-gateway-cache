# API Gateway Makefile
# Comandos para facilitar o desenvolvimento e deploy

.PHONY: help build up down logs clean test dev prod

# Variáveis
COMPOSE_FILE = docker-compose.yml
COMPOSE_FILE_PROD = docker-compose.prod.yml

# Comando padrão
help: ## Mostrar ajuda
	@echo "API Gateway - Comandos disponíveis:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Comandos de desenvolvimento
build: ## Construir todas as imagens
	docker-compose build

up: ## Iniciar todos os serviços
	docker-compose up -d

down: ## Parar todos os serviços
	docker-compose down

restart: ## Reiniciar todos os serviços
	docker-compose restart

logs: ## Ver logs de todos os serviços
	docker-compose logs -f

logs-gateway: ## Ver logs do API Gateway
	docker-compose logs -f gateway

logs-nginx: ## Ver logs do Nginx
	docker-compose logs -f nginx

logs-redis: ## Ver logs do Redis
	docker-compose logs -f redis

# Status e monitoramento
status: ## Verificar status dos containers
	docker-compose ps

health: ## Verificar health dos serviços
	@echo "Verificando health dos serviços..."
	@curl -s http://localhost/health | jq . || echo "Gateway não disponível"
	@curl -s http://localhost/nginx-health || echo "Nginx não disponível"

# Desenvolvimento
dev: ## Iniciar em modo desenvolvimento
	docker-compose up -d redis
	@echo "Redis iniciado. Execute manualmente:"
	@echo "cd gateway && pip install -r requirements.txt && uvicorn src.main:app --reload"

dev-services: ## Iniciar apenas serviços de infraestrutura
	docker-compose up -d redis nginx

# Cache
cache-clear: ## Limpar cache Redis
	curl -X DELETE http://localhost/cache

cache-info: ## Informações do cache Redis
	docker-compose exec redis redis-cli info memory

# Testes
test: ## Executar testes
	@echo "Executando testes..."
	curl -s http://localhost/health
	curl -s http://localhost/api/users/users
	curl -s http://localhost/api/products/products

# Limpeza
clean: ## Limpar containers, volumes e imagens não utilizadas
	docker-compose down -v --remove-orphans
	docker system prune -f

clean-all: ## Limpeza completa (cuidado!)
	docker-compose down -v --remove-orphans
	docker system prune -af
	docker volume prune -f

# Produção
prod-build: ## Build para produção
	docker-compose -f $(COMPOSE_FILE_PROD) build

prod-up: ## Iniciar em produção
	docker-compose -f $(COMPOSE_FILE_PROD) up -d

prod-down: ## Parar produção
	docker-compose -f $(COMPOSE_FILE_PROD) down

# Monitoramento
monitoring: ## Iniciar com monitoramento
	docker-compose --profile monitoring up -d

monitoring-down: ## Parar monitoramento
	docker-compose --profile monitoring down

# Backup
backup-redis: ## Backup do Redis
	docker-compose exec redis redis-cli BGSAVE
	docker cp $$(docker-compose ps -q redis):/data/dump.rdb ./backup/redis-$$(date +%Y%m%d_%H%M%S).rdb

# Utilitários
shell-gateway: ## Shell no container do gateway
	docker-compose exec gateway bash

shell-nginx: ## Shell no container do nginx
	docker-compose exec nginx sh

shell-redis: ## Shell no container do redis
	docker-compose exec redis sh

redis-cli: ## Acessar Redis CLI
	docker-compose exec redis redis-cli

# Instalação
install: ## Primeira instalação
	@echo "Instalando API Gateway..."
	@echo "1. Verificando Docker..."
	@docker --version
	@docker-compose --version
	@echo "2. Construindo imagens..."
	@make build
	@echo "3. Iniciando serviços..."
	@make up
	@echo "4. Aguardando inicialização..."
	@sleep 10
	@echo "5. Testando..."
	@make test
	@echo "✅ Instalação concluída!"
	@echo "Acesse: http://localhost"

# Atualização
update: ## Atualizar sistema
	git pull
	make build
	make down
	make up
	make test

# Informações
info: ## Informações do sistema
	@echo "=== API Gateway Info ==="
	@echo "Containers:"
	@docker-compose ps
	@echo ""
	@echo "Uso de recursos:"
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
	@echo ""
	@echo "Rede:"
	@docker network ls | grep api-gateway
	@echo ""
	@echo "Volumes:"
	@docker volume ls | grep api-gateway

# Debug
debug: ## Informações de debug
	@echo "=== Debug Info ==="
	@echo "Docker version:"
	@docker --version
	@echo ""
	@echo "Docker Compose version:"
	@docker-compose --version
	@echo ""
	@echo "Containers:"
	@docker-compose ps
	@echo ""
	@echo "Logs recentes do Gateway:"
	@docker-compose logs --tail=20 gateway
	@echo ""
	@echo "Logs recentes do Nginx:"
	@docker-compose logs --tail=20 nginx