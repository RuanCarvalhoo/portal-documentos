'use client';

import { type ReactNode, useEffect, useRef } from 'react';

interface ErrorAlertProps {
  messages: string[];
  /** Ações para resolver o erro (ex.: no conflito de versão, ver a versão atual) */
  children?: ReactNode;
}

/**
 * Erros vindos da API (400 com lista, 401, 409, 429...). A região role=alert fica sempre
 * montada: leitores de tela anunciam o conteúdo que entra nela, o que não acontece de forma
 * confiável quando o elemento já nasce com o texto.
 */
export function ErrorAlert({ messages, children }: ErrorAlertProps) {
  const ref = useRef<HTMLDivElement>(null);
  // No editor o botão Salvar fica ~900px abaixo do topo do formulário: sem rolar até o erro,
  // quem clicou em salvar não veria por que nada aconteceu
  useEffect(() => {
    if (messages.length > 0) {
      ref.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [messages]);

  return (
    <div role="alert" ref={ref} className="scroll-mt-20">
      {messages.length > 0 && (
        <div className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger-fg">
          {messages.length === 1 ? (
            <p>{messages[0]}</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4">
              {messages.map((message, index) => (
                <li key={`${index}-${message}`}>{message}</li>
              ))}
            </ul>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
