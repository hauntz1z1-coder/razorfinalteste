'use client'

import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface FeedHeaderProps {
  user: User | null
  onLogout: () => void
}

export default function FeedHeader({ user, onLogout }: FeedHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary tracking-wider">RAZOR</h1>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Feed</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Home
          </Link>
          
          {user ? (
            <>
              <Link
                href="/perfil"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Perfil
              </Link>
              <button
                onClick={onLogout}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="bg-primary text-primary-foreground font-medium py-1.5 px-4 rounded-md text-sm hover:bg-primary/90 transition-all"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
