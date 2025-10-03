# 🚀 Configuração do Repositório Git - API Gateway Cache

## 📋 Pré-requisitos

### 1. Instalar Git
Se o Git não estiver instalado, baixe e instale de: https://git-scm.com/download/win

### 2. Configurar Git (primeira vez)
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"
```

## 🔧 Configuração do Repositório Local

### 1. Inicializar repositório Git
```bash
cd "C:\Users\joaog\OneDrive\Área de Trabalho\api-gateway-cache"
git init
```

### 2. Adicionar todos os arquivos
```bash
git add .
```

### 3. Fazer commit inicial
```bash
git commit -m "feat: implementação completa do API Gateway com Redis cache

- API Gateway em Python/FastAPI com cache inteligente
- Nginx como proxy reverso com rate limiting
- Redis configurado para cache otimizado
- Microserviços de exemplo (users e products)
- Docker e docker-compose para containerização
- Makefile com comandos facilitados
- Documentação completa no README.md"
```

## 🌐 Configuração do GitHub

### 1. Criar repositório no GitHub
1. Acesse: https://github.com/new
2. Nome do repositório: `api-gateway-cache`
3. Descrição: `API Gateway com Redis Cache, Nginx Proxy Reverso e Microserviços`
4. Marque como **Público** ou **Privado** (sua escolha)
5. **NÃO** inicialize com README, .gitignore ou licença (já temos esses arquivos)
6. Clique em "Create repository"

### 2. Conectar repositório local ao GitHub
```bash
git remote add origin https://github.com/SEU_USUARIO/api-gateway-cache.git
git branch -M main
git push -u origin main
```

**Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub**

## 🔄 Comandos Git Úteis para o Projeto

### Verificar status
```bash
git status
```

### Adicionar mudanças
```bash
git add .
git commit -m "descrição das mudanças"
```

### Enviar para GitHub
```bash
git push
```

### Atualizar do GitHub
```bash
git pull
```

### Criar nova branch para features
```bash
git checkout -b feature/nova-funcionalidade
```

### Voltar para main
```bash
git checkout main
```

## 📁 Estrutura do Projeto no GitHub

Após o push, seu repositório terá:

```
api-gateway-cache/
├── .env                    # Variáveis de ambiente
├── .gitignore             # Arquivos ignorados pelo Git
├── README.md              # Documentação principal
├── Makefile               # Comandos facilitados
├── docker-compose.yml     # Orquestração dos containers
├── redis.conf             # Configuração do Redis
├── gateway/               # API Gateway Python
├── nginx/                 # Configuração Nginx
└── services/              # Microserviços de exemplo
```

## 🏷️ Sugestões de Tags/Releases

Após o primeiro push, você pode criar tags para versões:

```bash
git tag -a v1.0.0 -m "Versão inicial do API Gateway"
git push origin v1.0.0
```

## 🔒 Segurança

⚠️ **IMPORTANTE**: O arquivo `.env` está no `.gitignore` por segurança. 
Nunca commite senhas ou chaves de API reais!

Para produção, configure as variáveis de ambiente diretamente no servidor ou use serviços como GitHub Secrets para CI/CD.

## 📞 Próximos Passos

1. Instale o Git se necessário
2. Execute os comandos acima na ordem
3. Seu projeto estará disponível no GitHub!
4. Configure CI/CD se desejar (GitHub Actions)
5. Adicione colaboradores se necessário

---

**Projeto**: API Gateway com Redis Cache  
**Tecnologias**: Python, FastAPI, Redis, Nginx, Docker, Node.js  
**Autor**: João  
**Data**: $(Get-Date -Format "dd/MM/yyyy")