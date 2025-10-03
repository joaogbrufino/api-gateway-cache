"""
API Gateway com Cache Redis
Sistema de gateway que atua como intermediário entre clientes e APIs externas
"""

import os
import json
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

import httpx
import redis.asyncio as redis
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import structlog
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configuração de logging
logger = structlog.get_logger()

# Configurações
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
CACHE_TTL = int(os.getenv("CACHE_TTL", 300))
API_PORT = int(os.getenv("API_PORT", 8000))
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:3001")
PRODUCT_SERVICE_URL = os.getenv("PRODUCT_SERVICE_URL", "http://localhost:3002")

# Inicializar FastAPI
app = FastAPI(
    title="API Gateway",
    description="Gateway com cache Redis para otimização de performance",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cliente Redis
redis_client: Optional[redis.Redis] = None

# Cliente HTTP
http_client = httpx.AsyncClient(timeout=30.0)

class CacheService:
    """Serviço de cache com Redis"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    def _generate_cache_key(self, method: str, url: str, params: Dict = None, body: Any = None) -> str:
        """Gera chave única para cache baseada na requisição"""
        key_data = {
            "method": method,
            "url": url,
            "params": params or {},
            "body": body
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return f"gateway_cache:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    async def get(self, key: str) -> Optional[Dict]:
        """Recupera dados do cache"""
        try:
            cached_data = await self.redis.get(key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.error("Erro ao recuperar cache", key=key, error=str(e))
        return None
    
    async def set(self, key: str, data: Dict, ttl: int = CACHE_TTL) -> bool:
        """Armazena dados no cache"""
        try:
            await self.redis.setex(key, ttl, json.dumps(data))
            return True
        except Exception as e:
            logger.error("Erro ao armazenar cache", key=key, error=str(e))
            return False
    
    async def delete(self, pattern: str) -> int:
        """Remove chaves do cache por padrão"""
        try:
            keys = await self.redis.keys(pattern)
            if keys:
                return await self.redis.delete(*keys)
        except Exception as e:
            logger.error("Erro ao deletar cache", pattern=pattern, error=str(e))
        return 0

class ProxyService:
    """Serviço de proxy para APIs externas"""
    
    def __init__(self, http_client: httpx.AsyncClient, cache_service: CacheService):
        self.http_client = http_client
        self.cache = cache_service
        self.service_urls = {
            "users": USER_SERVICE_URL,
            "products": PRODUCT_SERVICE_URL
        }
    
    async def forward_request(
        self, 
        service: str, 
        path: str, 
        method: str, 
        params: Dict = None, 
        json_data: Any = None,
        headers: Dict = None
    ) -> Dict:
        """Encaminha requisição para serviço externo com cache"""
        
        if service not in self.service_urls:
            raise HTTPException(status_code=404, detail=f"Serviço '{service}' não encontrado")
        
        target_url = f"{self.service_urls[service]}{path}"
        
        # Verificar cache para métodos GET
        if method.upper() == "GET":
            cache_key = self.cache._generate_cache_key(method, target_url, params)
            cached_response = await self.cache.get(cache_key)
            if cached_response:
                logger.info("Cache hit", url=target_url, method=method)
                return {
                    "data": cached_response["data"],
                    "cached": True,
                    "cache_timestamp": cached_response["timestamp"]
                }
        
        # Fazer requisição para API externa
        try:
            logger.info("Fazendo requisição externa", url=target_url, method=method)
            
            response = await self.http_client.request(
                method=method,
                url=target_url,
                params=params,
                json=json_data,
                headers=headers
            )
            
            response_data = {
                "status_code": response.status_code,
                "data": response.json() if response.content else None,
                "headers": dict(response.headers)
            }
            
            # Armazenar em cache se for GET e resposta for bem-sucedida
            if method.upper() == "GET" and 200 <= response.status_code < 300:
                cache_key = self.cache._generate_cache_key(method, target_url, params)
                cache_data = {
                    "data": response_data,
                    "timestamp": datetime.utcnow().isoformat()
                }
                await self.cache.set(cache_key, cache_data)
            
            return {
                "data": response_data,
                "cached": False
            }
            
        except httpx.RequestError as e:
            logger.error("Erro na requisição externa", url=target_url, error=str(e))
            raise HTTPException(status_code=502, detail=f"Erro ao conectar com {service}")
        except Exception as e:
            logger.error("Erro inesperado", error=str(e))
            raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Dependências
async def get_cache_service() -> CacheService:
    """Dependency para obter serviço de cache"""
    return CacheService(redis_client)

async def get_proxy_service(cache_service: CacheService = Depends(get_cache_service)) -> ProxyService:
    """Dependency para obter serviço de proxy"""
    return ProxyService(http_client, cache_service)

@app.on_event("startup")
async def startup_event():
    """Inicialização da aplicação"""
    global redis_client
    
    try:
        # Conectar ao Redis
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        
        # Testar conexão
        await redis_client.ping()
        logger.info("Conectado ao Redis", host=REDIS_HOST, port=REDIS_PORT)
        
    except Exception as e:
        logger.error("Erro ao conectar ao Redis", error=str(e))
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Limpeza na finalização da aplicação"""
    if redis_client:
        await redis_client.close()
    await http_client.aclose()

# Rotas

@app.get("/")
async def root():
    """Endpoint de health check"""
    return {
        "message": "API Gateway funcionando",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Verificação de saúde dos serviços"""
    health_status = {
        "gateway": "healthy",
        "redis": "unknown",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        await redis_client.ping()
        health_status["redis"] = "healthy"
    except Exception:
        health_status["redis"] = "unhealthy"
    
    return health_status

@app.delete("/cache")
async def clear_cache(
    pattern: str = "gateway_cache:*",
    cache_service: CacheService = Depends(get_cache_service)
):
    """Limpar cache por padrão"""
    deleted_count = await cache_service.delete(pattern)
    return {
        "message": f"Cache limpo: {deleted_count} chaves removidas",
        "pattern": pattern
    }

# Rotas de proxy para serviços

@app.api_route("/api/{service}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_request(
    service: str,
    path: str,
    request: Request,
    proxy_service: ProxyService = Depends(get_proxy_service)
):
    """Proxy genérico para todos os serviços"""
    
    # Extrair dados da requisição
    method = request.method
    params = dict(request.query_params)
    headers = dict(request.headers)
    
    # Remover headers que podem causar problemas
    headers.pop("host", None)
    headers.pop("content-length", None)
    
    # Obter body para métodos que suportam
    json_data = None
    if method in ["POST", "PUT", "PATCH"]:
        try:
            json_data = await request.json()
        except Exception:
            pass
    
    # Encaminhar requisição
    result = await proxy_service.forward_request(
        service=service,
        path=f"/{path}",
        method=method,
        params=params,
        json_data=json_data,
        headers=headers
    )
    
    # Retornar resposta
    response_data = result["data"]
    return JSONResponse(
        content=response_data["data"],
        status_code=response_data["status_code"],
        headers={
            "X-Cache-Status": "HIT" if result["cached"] else "MISS",
            "X-Gateway-Version": "1.0.0"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=API_PORT,
        reload=True,
        log_level="info"
    )