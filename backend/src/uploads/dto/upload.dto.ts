export class UploadDto {
  id: string;
  /** Nome original (só para exibir; o tipo vem dos bytes do arquivo) */
  fileName: string;
  /** @example image/png */
  mimeType: string;
  /** Tamanho em bytes */
  size: number;
  /**
   * Caminho da imagem na API. No portal, o Markdown usa `/api` + este caminho (proxy do frontend)
   * @example /uploads/01a10ce0-bfc3-759d-ae70-030a8bafc793
   */
  path: string;
}
