import { posix } from 'node:path';

/**
 * Transformações puras dos documentos de docs/ para páginas do portal (usadas pelo seed).
 * Caminhos são sempre relativos à pasta docs/, com "/" (posix).
 */

/** O primeiro título "# …" vira o título da página; o resto é o conteúdo (sem o H1 repetido). */
export function splitTitle(markdown: string): { title: string; body: string } {
  const match = /^#[ \t]+(.+?)[ \t]*\r?\n/m.exec(markdown);
  if (!match) {
    throw new Error('Documento sem título (# Título) na primeira seção');
  }
  const body = markdown.slice(0, match.index) + markdown.slice(match.index + match[0].length);
  return { title: match[1], body: body.replace(/^\s*\n/, '').trimEnd() + '\n' };
}

// [texto](destino) e ![alt](destino), com título opcional: [a](b "título")
const LINK = /(!?)\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g;
const FENCE = /^\s*(```|~~~)/;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i;

/** Aplica `replace` a cada link fora dos blocos de código (exemplos de código ficam intactos). */
function mapLinks(
  markdown: string,
  replace: (image: boolean, label: string, target: string, title: string) => string,
): string {
  let inFence = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (FENCE.test(line)) {
        inFence = !inFence;
        return line;
      }
      return inFence
        ? line
        : line.replace(LINK, (_all, bang: string, label: string, target: string, title: string) =>
            replace(bang === '!', label, target, title),
          );
    })
    .join('\n');
}

/** Caminho (relativo a docs/) do destino relativo de um link, e a âncora, se houver. */
export function resolveTarget(fromFile: string, target: string): { path: string; hash: string } {
  const [rawPath, hash = ''] = target.split('#');
  return { path: posix.normalize(posix.join(posix.dirname(fromFile), decodeURI(rawPath))), hash };
}

/** Imagens locais referenciadas pelo documento (relativas a docs/). */
export function localImages(markdown: string, fromFile: string): string[] {
  const found: string[] = [];
  mapLinks(markdown, (image, label, target, title) => {
    if (image && !EXTERNAL.test(target)) {
      found.push(resolveTarget(fromFile, target).path);
    }
    return `${image ? '!' : ''}[${label}](${target}${title})`;
  });
  return found;
}

export interface LinkTargets {
  /** Documento (relativo a docs/) → id da página criada para ele */
  pages: ReadonlyMap<string, string>;
  /** Imagem (relativa a docs/) → id do upload */
  images: ReadonlyMap<string, string>;
  /** Base para arquivos do repositório que não viram página (ex.: …/blob/main) */
  repositoryUrl: string;
}

/**
 * Troca os destinos relativos pelos endereços do portal:
 * - documento que virou página → /pages/<id>#âncora;
 * - imagem → /api/uploads/<id> (servida pelo proxy do frontend);
 * - qualquer outro arquivo do repositório → link para ele no GitHub.
 * Links absolutos, âncoras e exemplos dentro de blocos de código não mudam.
 */
export function rewriteLinks(markdown: string, fromFile: string, targets: LinkTargets): string {
  return mapLinks(markdown, (image, label, target, title) => {
    if (EXTERNAL.test(target)) {
      return `${image ? '!' : ''}[${label}](${target}${title})`;
    }
    const { path, hash } = resolveTarget(fromFile, target);
    const anchor = hash ? `#${hash}` : '';
    if (image) {
      const upload = targets.images.get(path);
      if (!upload) {
        throw new Error(`Imagem não enviada: ${path} (em ${fromFile})`);
      }
      return `![${label}](/api/uploads/${upload}${title})`;
    }
    const page = targets.pages.get(path);
    if (page) {
      return `[${label}](/pages/${page}${anchor}${title})`;
    }
    // Fora de docs/ ("../backend/…") o caminho já é relativo à raiz do repositório
    const inRepository = path.startsWith('../') ? path.slice(3) : `docs/${path}`;
    return `[${label}](${targets.repositoryUrl}/${encodeURI(inRepository)}${anchor}${title})`;
  });
}
