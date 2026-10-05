Primeira versão desta página, antes dos diagramas e do proxy `/api`: o navegador ainda chamava a API direto. Abra o **Histórico** para comparar com a versão atual.

## Containers

```
Navegador ──────────────► frontend :3000 (Next.js)
   │                         │  Server Components buscam dados em
   │                         └─► http://backend:3001   (rede interna do Compose)
   │
   └── formulários / login ─► http://localhost:3001     (URL pública da API)
                                  backend :3001 (NestJS)
                                     └─► db :5432 (PostgreSQL)
```

Dentro do Docker, os containers se encontram pelo **nome do serviço**; o navegador só enxerga as portas publicadas no host. Por isso o frontend usava **duas URLs** da API: a interna para renderizar no servidor e a pública, embutida no build, para as chamadas do navegador.
