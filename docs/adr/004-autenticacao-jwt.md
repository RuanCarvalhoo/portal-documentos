# ADR 004 — Autenticação: JWT stateless com guard próprio

**Status:** aceito

## Contexto

Leitura do portal é pública; criar, editar e excluir exigem usuário autenticado (sem perfis de permissão). O frontend é uma aplicação Next.js separada que chama a API REST, e o desafio pede autenticação via JWT.

## Opções consideradas

- **JWT stateless + guard próprio** (`@nestjs/jwt` + `CanActivate`) — poucas peças, segue a receita oficial de autenticação do Nest.
- **Passport (`passport-jwt`)** — mesmo resultado com mais conceitos (strategies, `AuthGuard('jwt')`), útil quando há vários métodos de login.
- **Sessão no servidor (cookie + store)** — revogação imediata, mas exige store compartilhado e proteção CSRF.

## Decisão

- Login e cadastro devolvem um **access token JWT HS256** (`sub` = id do usuário) com expiração de **8 h**; não há refresh token.
- Um `AuthGuard` próprio valida `Authorization: Bearer <token>` com algoritmo fixo (`HS256`) e anexa `request.user`; o decorator `@CurrentUser()` o expõe aos controllers.
- Senhas com **bcryptjs** (JS puro, sem toolchain nativa no Alpine), custo 10.
- `JWT_SECRET` obrigatório com no mínimo 32 caracteres, validado no boot.
- Login responde **401 genérico** ("Credenciais inválidas") e roda o bcrypt mesmo quando o e-mail não existe, para não revelar contas por mensagem nem por tempo de resposta.
- `@nestjs/throttler` limita login e cadastro a 10 tentativas por minuto por IP.
- E-mails normalizados (trim + minúsculas) antes de salvar e comparar.
- No frontend o token fica em `localStorage` (trade-off abaixo).

## Consequências

- API sem estado de sessão: escala horizontalmente sem store compartilhado.
- Um token vazado vale até expirar — não há revogação. A expiração curta limita a janela.
- `localStorage` é legível por JavaScript: um XSS roubaria o token. Mitigação: o Markdown é renderizado **sem HTML cru** (sem `rehype-raw`), fechando a principal porta de XSS do portal.

- O `JWT_SECRET` padrão do `docker-compose.yml` é **público** (existe só para o avaliador subir o projeto sem configurar nada). Qualquer ambiente real precisa definir o próprio segredo.
- O rate limit usa o IP da conexão. Atrás de um proxy reverso seria preciso configurar `trust proxy` com o número exato de saltos; com `true`, um `X-Forwarded-For` forjado burlaria o limite.

## Quando eu mudaria de ideia

Com requisitos de revogação (logout em todos os dispositivos, bloqueio de conta) ou dados sensíveis, eu passaria para **refresh token rotativo em cookie `httpOnly` + `SameSite`** com access token curto em memória, e uma lista de revogação (ex.: Redis) — e adicionaria proteção CSRF.
