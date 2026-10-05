# Diagramas

Desenhos da arquitetura no estilo do [Excalidraw](https://excalidraw.com). Cada diagrama tem dois arquivos:

- `NN-nome.excalidraw`: a fonte editável;
- `NN-nome.png`: a imagem exportada (2x, fundo branco), usada nos documentos e no portal.

| Diagrama | Onde aparece |
|---|---|
| [01-visao-geral](01-visao-geral.png) | [Visão geral](../arquitetura/visao-geral.md) |
| [02-camadas-backend](02-camadas-backend.png) | [Backend](../arquitetura/backend.md) |
| [03-camadas-frontend](03-camadas-frontend.png) | [Frontend](../arquitetura/frontend.md) |
| [04-fluxo-salvar-pagina](04-fluxo-salvar-pagina.png) | [Fluxos principais](../arquitetura/fluxos.md) |
| [05-fluxo-upload](05-fluxo-upload.png) | [Fluxos principais](../arquitetura/fluxos.md) |
| [06-modelo-de-dados](06-modelo-de-dados.png) | [Banco de dados](../banco-de-dados.md) |
| [07-escala-e-falhas](07-escala-e-falhas.png) | [Pontos de falha e escalabilidade](../arquitetura/escalabilidade.md) |

## Como editar

1. Abra o `.excalidraw` em [excalidraw.com](https://excalidraw.com) (menu → Abrir) ou na extensão do Excalidraw para VS Code.
2. Edite e salve o `.excalidraw` com o mesmo nome.
3. Exporte em PNG com **escala 2x** e **fundo**, sobrescrevendo o `.png`.

No portal, as imagens entram pelo seed como uploads, e os links `../diagramas/x.png` dos documentos viram `/api/uploads/<id>`. Para ver um diagrama novo no portal, recrie o banco: `docker compose down -v && docker compose up --build`.
