# ADR 008 — Chamadas do navegador: proxy `/api` no servidor do Next

**Status:** aceito (substitui a chamada direta do navegador para a API)

## Contexto

Até aqui o navegador chamava a API direto em `http://localhost:3001`: login, cadastro e todas as escritas. Isso trazia três dependências frágeis:

- **A URL da API embutida no bundle.** `NEXT_PUBLIC_API_URL` é lida no `next build`. Mudar a porta, o host ou acessar de outra máquina exigia rebuild.
- **CORS.** A API só aceitava a origem exata `http://localhost:3000`. Abrir o portal por `http://127.0.0.1:3000` já bastava para o navegador bloquear o login.
- **A porta 3001 acessível a partir do navegador.** Em VM, WSL, acesso por outra máquina ou com a API reiniciando, o navegador recebia *connection refused*.

Os três casos aparecem para o usuário com a mesma mensagem, "Não foi possível conectar à API". Ao rodar o projeto do zero, foi exatamente o que aconteceu.

## Opções consideradas

- **Manter a chamada direta e afrouxar o CORS** (várias origens, ou `*`): resolve o 127.0.0.1, mas não a porta inacessível nem a URL fixa no build. `*` com `Authorization` também abre a API para qualquer site.
- **`rewrites()` no `next.config.ts`**: o destino é resolvido no build com `output: 'standalone'`, e não dá para acrescentar o IP do cliente nem o id da requisição.
- **Proxy reverso (nginx/Caddy) na frente dos dois**: é o desenho de produção (`/` → Next, `/api` → API), mas é mais um container para o avaliador subir e configurar.
- **Route Handler `/api/[...path]` no Next**: o navegador fala só com a origem do portal, e o servidor do Next repassa para `API_URL`, lida em tempo de execução.

## Decisão

Route Handler em `frontend/src/app/api/[...path]/route.ts`, com a lógica pura em `frontend/src/lib/proxy.ts` (testada):

- No navegador, `apiFetch` usa a base `/api`; no servidor (Server Components), continua usando `API_URL` direto pela rede interna.
- **Allowlist de cabeçalhos** nos dois sentidos:
  - Ida: `authorization`, `content-type`, `accept` e `if-none-match`. Cookies e cabeçalhos `x-portal-*` enviados pelo cliente não passam.
  - Volta: `content-type`, `cache-control`, `etag`, `retry-after`, `content-disposition` e `x-request-id`.
- **IP do visitante** repassado com o segredo compartilhado (`INTERNAL_API_SECRET`), como o `serverFetch` já fazia. Sem isso, o rate limit de login e escritas viraria um balde único para todos os visitantes.
- **Id da requisição** (`x-request-id`) gerado no proxy e propagado para a API, que o usa nos logs ([ADR 009](009-logs-estruturados.md)).
- **Corpo em stream** (`duplex: 'half'`): o multipart do upload de imagens não fica em memória no Next.
- **Destino fixo:** a URL de destino é montada por concatenação e a origem é conferida, então `/api//outro-host` não vira outro host.
- **API fora do ar ou lenta:** 502 ou 504 no mesmo envelope de erro da API, com uma linha de log JSON.

## Consequências

- O portal funciona por `localhost`, `127.0.0.1` ou qualquer host que alcance a porta 3000. A porta 3001 continua publicada só para o Swagger.
- Não há mais build arg: a mesma imagem do frontend serve para qualquer ambiente.
- As imagens enviadas (`/api/uploads/:id`) são servidas na origem do portal, sem precisar afrouxar o `Cross-Origin-Resource-Policy` do helmet.
- Mais um salto de rede nas chamadas do navegador. Dentro da rede do Compose, isso custa menos de 1 ms.
- **Premissa de implantação estendida:** o IP repassado é o último item do `X-Forwarded-For` que o Next recebe. Sem um proxy reverso na frente, um cliente consegue escolher esse valor. Isso já valia para a busca e agora vale também para login e escritas. Em produção, o balanceador ou proxy reverso precisa acrescentar o IP da conexão ao `X-Forwarded-For` (`$proxy_add_x_forwarded_for` no nginx). As portas do compose ficam só em `127.0.0.1`.
- O `CORS_ORIGIN` da API continua existindo para clientes que chamem a API direto, mas o portal não depende mais dele.

## Quando eu mudaria de ideia

Em produção, com um balanceador ou ingress que já roteia por caminho, `/api` iria direto para a API, sem passar pelo Node do Next. O Route Handler continuaria útil em desenvolvimento e no compose. Com a autenticação migrada para cookie `httpOnly` ([ADR 004](004-autenticacao-jwt.md)), este proxy na mesma origem também seria o lugar natural para isso.
