import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Erro de Autenticacao</h2>
          <p className="text-muted-foreground mb-6">
            Ocorreu um erro durante o processo de autenticacao. Por favor, tente novamente.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="inline-block bg-primary text-primary-foreground font-bold py-3 px-6 rounded-md hover:bg-primary/90 transition-all"
            >
              Tentar Novamente
            </Link>
            <Link
              href="/"
              className="text-muted-foreground hover:text-primary text-sm transition-colors"
            >
              Voltar ao site
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
