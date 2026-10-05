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

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm py-6">
      <h1 className="font-serif text-4xl tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
}

export function TextAreaField({ label, name, error, hint, id = name, ...textarea }: TextAreaFieldProps) {
  const messageId = `${id}-mensagem`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-foreground/40 focus:ring-2 focus:ring-accent-fg/25 aria-[invalid=true]:border-danger-fg/60"
        {...textarea}
      />
      {(error || hint) && (
        <p id={messageId} className={`mt-1.5 text-sm ${error ? 'text-danger-fg' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

// Estilos de link/botão reaproveitados em Server e Client Components
export const primaryButton =
  'inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3.5 text-sm font-medium text-background transition hover:opacity-90 active:scale-[0.98]';
export const secondaryButton =
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3.5 text-sm text-foreground transition-colors hover:bg-hover';
