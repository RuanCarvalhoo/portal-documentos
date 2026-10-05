# Escrevendo no portal

Como criar, organizar e manter documentação no portal. Para a sintaxe, veja o [Guia de Markdown](markdown.md).

## Perfis: quem pode o quê

| Perfil | Pode |
|---|---|
| **Leitor** | ler tudo, buscar e ver o histórico (também sem login) |
| **Editor** | criar e editar espaços; criar, editar, mover, restaurar e excluir páginas; usar tags; enviar imagens |
| **Admin** | tudo isso, mais excluir espaços e trocar perfis na tela **Usuários** |

Contas novas entram como **Leitor**. Para escrever, peça a um Admin que promova a sua conta. A mudança vale na hora para a API e, na interface, depois de recarregar.

## Espaços e páginas

- Um **espaço** agrupa páginas de um mesmo assunto: um time, um produto, uma área.
- Dentro de um espaço, as páginas formam uma **árvore** de até 10 níveis. Use **+ Subpágina** numa página, ou escolha a **Página pai** no editor. Trocar a página pai move a página e as subpáginas dela.
- Excluir uma página exclui as subpáginas e o histórico delas (há confirmação). Excluir um espaço, só o Admin pode, porque leva todas as páginas.

## O editor

- O **texto** fica à esquerda e o **preview** à direita, com abas no celular.
- Título até 200 caracteres; conteúdo até 50 mil.
- Se você tentar sair com texto não salvo, o portal avisa antes.

### Tags

Digite no campo **Tags** e use Enter ou vírgula para acrescentar; o × remove. As tags são normalizadas: "Banco de Dados" vira `banco-de-dados`. Use até 10 por página, só com letras, números e hífens.

Clique numa tag em qualquer página para ver todas as páginas com ela, em qualquer espaço, ou abra **Tags** na barra lateral.

### Imagens

Use o botão **Inserir imagem**, cole uma imagem da área de transferência (um print, por exemplo) ou arraste um arquivo para o texto. São aceitos PNG, JPEG, GIF e WebP de até 5 MB. O editor insere no cursor:

```markdown
![nome-do-arquivo](/api/uploads/…)
```

Troque o texto entre colchetes por uma descrição da imagem: é o que leitores de tela leem. SVG não é aceito, porque pode carregar script.

## Histórico e conflitos

- Cada vez que o título ou o texto mudam, a versão anterior vai para o **Histórico**, com quem a escreveu e quando. Mover a página ou trocar só as tags não gera versão.
- **Restaurar** abre o editor com o texto antigo. Ao salvar, ele vira uma versão nova, e a atual também fica no histórico: nada se perde.
- Se outra pessoa salvou a mesma página depois que você abriu o editor, o portal avisa em vez de apagar o trabalho dela. O seu texto continua no editor, e você escolhe entre **ver a versão atual** (em outra aba) ou **salvar por cima**.

## Boas práticas

- **Títulos curtos e específicos**: "Autenticação" diz menos que "Como o login gera e valida o JWT".
- **Uma página, um assunto.** Quando uma página cresce demais, vire as seções em subpáginas.
- **Comece pelo porquê:** o contexto e a decisão importam mais do que o passo a passo, que muda.
- **Diagrama tem fonte:** guarde o arquivo editável (por exemplo, `.excalidraw`) junto com a imagem.
- **Ligue as páginas:** links internos e tags ajudam quem chega pela busca.
