# ADR 010 — Upload de imagens: bytes no PostgreSQL, servidos pela API

**Status:** aceito

## Contexto

Até aqui as páginas só aceitavam imagens por URL externa. Diagramas e prints precisavam ser hospedados em outro lugar. O editor precisa receber uma imagem (botão, colar ou arrastar), guardá-la e inserir o Markdown que a exibe.

Restrições: o projeto sobe com **um comando**, a API pode rodar com mais de uma réplica e a leitura é pública.

## Opções consideradas

- **Disco local (volume Docker)**: simples, mas cada réplica teria o próprio disco. Uma imagem enviada para a réplica A daria 404 na réplica B sem armazenamento compartilhado (NFS, EFS).
- **Object storage (S3 / MinIO no compose)**: o desenho de produção, com CDN na frente, URL assinada e custo por GB baixo. Por outro lado, é um container a mais, um bucket para criar no boot, credenciais e um serviço extra nos testes e2e.
- **PostgreSQL (`bytea`)**: nenhuma peça nova; transacional com o resto, entra no mesmo backup e qualquer réplica serve qualquer imagem. Em troca, o banco cresce com bytes que ele não precisa indexar, e cada leitura de imagem passa pela API e pelo pool de conexões.

## Decisão

PostgreSQL, na tabela `uploads`, atrás de um serviço (`UploadsService`) que isola o armazenamento do resto da API:

- **`POST /uploads`** (Editor ou Admin, 30 envios por minuto): uma imagem de até **5 MB** no campo `file`.
  - O multer só lê o corpo depois que o `AuthGuard` aprovou: sem login, nada é bufferizado.
  - O arquivo fica em memória (`memoryStorage`), com teto de tamanho.
- **O tipo vem dos bytes (assinatura do arquivo), não do nome nem do `Content-Type`** enviados pelo cliente:
  - aceitos: PNG, JPEG, GIF e WebP;
  - **SVG é recusado**: é XML que pode carregar script e rodaria na origem do portal, onde o token está no `localStorage`.
- **Deduplicação por sha256:** o mesmo arquivo enviado de novo devolve o registro existente.
- **`bytea` com `STORAGE EXTERNAL`:** fora da linha (TOAST) e sem recompressão, já que os quatro formatos já vêm comprimidos.
- **`GET /uploads/:id`** (público, como as páginas):
  - `Cache-Control: public, max-age=31536000, immutable`, porque uma imagem nunca muda de conteúdo no mesmo id;
  - `ETag` = sha256, com resposta 304 a `If-None-Match`;
  - `Content-Disposition: inline`, `nosniff` e a CSP do helmet.
- **No Markdown, a imagem é `/api/uploads/<id>`:** um caminho relativo à origem do portal, servido pelo proxy ([ADR 008](008-proxy-da-api-no-frontend.md)). Não depende de host nem de porta, e não precisa afrouxar o `Cross-Origin-Resource-Policy`.
- **O seed usa o mesmo caminho:** os diagramas da documentação entram no portal como uploads.

## Consequências

- O "um comando" continua igual, e os e2e cobrem o upload contra o banco real.
- **Imagens órfãs:** uma imagem enviada e depois apagada do texto continua na tabela. Uma limpeza (uploads sem referência em nenhuma página nem versão há mais de N dias) fica para quando o volume justificar.
- Cada imagem servida ocupa a API e uma conexão do pool durante a leitura. Com o cache imutável, o navegador pede cada imagem uma vez.
- Backups e réplicas do banco crescem junto com as imagens.

## Quando eu mudaria de ideia

Com volume real de imagens (dezenas de GB) ou tráfego de leitura alto, eu trocaria a implementação do `UploadsService` por **object storage (S3/R2/MinIO)** com uma **CDN** na frente. O upload passaria a usar URL pré-assinada (o arquivo nem passa pela API), e a migração copiaria os `bytea` para o bucket mantendo os ids. Ver [Pontos de falha e escalabilidade](../arquitetura/escalabilidade.md).
