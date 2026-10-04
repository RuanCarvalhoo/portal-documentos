import type { InputHTMLAttributes, ReactNode } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
}

/** Campo com rótulo, dica e erro ligados ao input por aria-describedby. */
export function Field({ label, name, error, hint, id = name, ...input }: FieldProps) {
  const messageId = `${id}-mensagem`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className="mt-1.5 block h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition-colors focus:border-foreground/40 focus:ring-2 focus:ring-accent-fg/25 aria-[invalid=true]:border-danger-fg/60"
        {...input}
      />
      {(error || hint) && (
        <p id={messageId} className={`mt-1.5 text-sm ${error ? 'text-danger-fg' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    // aria-disabled (e não disabled): o botão não perde o foco do teclado enquanto envia;
    // quem usa o botão ignora envios repetidos com pending
    <button
      type="submit"
      aria-disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 active:scale-[0.98] aria-disabled:cursor-wait aria-disabled:opacity-60"
    >
      {pending ? 'Aguarde...' : children}
    </button>
  );
}

/**
 * Erros vindos da API (400 com lista, 401, 409, 429...). A região role=alert fica sempre
 * montada: leitores de tela anunciam o conteúdo que entra nela, o que não acontece de forma
 * confiável quando o elemento já nasce com o texto.
 */
export function ErrorAlert({ messages }: { messages: string[] }) {
  return (
    <div role="alert">
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
        </div>
      )}
    </div>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm py-6">
      <h1 className="font-serif text-4xl tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
