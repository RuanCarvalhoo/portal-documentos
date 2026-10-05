// Sem decorators de propósito: o seed (tsx, sem o tsconfig na imagem) também importa daqui.

// Teto do Markdown em caracteres. O corpo da requisição ainda passa pelo limite do body parser
// (100 KB): texto com muitos caracteres multibyte pode receber 413 antes de chegar aqui.
export const MAX_CONTENT_LENGTH = 50_000;
