'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import PostCard from '@/components/feed/post-card'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  created_at: string
}

interface Post {
  id: string
  content: string
  image_url: string | null
  created_at: string
  user_id: string
  profiles: {
    username: string
    avatar_url: string | null
  } | null
  likes: { user_id: string }[]
}

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Fetch user's posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (username, avatar_url),
          likes (user_id)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false })

      if (postsData) {
        setPosts(postsData)
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Usuario nao encontrado</h1>
          <Link href="/feed" className="text-primary hover:underline">
            Voltar ao Feed
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary tracking-wider">RAZOR</h1>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Home
            </Link>
            <Link
              href="/feed"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Feed
            </Link>
            {currentUser ? (
              <Link
                href="/perfil"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Meu Perfil
              </Link>
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

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Card */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-bold text-2xl">
                  {profile.username?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-2">
                {profile.username || 'Usuario'}
              </h2>
              {profile.bio && (
                <p className="text-foreground mb-2">{profile.bio}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex gap-6 mt-6 pt-4 border-t border-border">
            <div>
              <span className="text-xl font-bold text-foreground">{posts.length}</span>
              <span className="text-muted-foreground text-sm ml-1">publicacoes</span>
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">
                {posts.reduce((acc, post) => acc + post.likes.length, 0)}
              </span>
              <span className="text-muted-foreground text-sm ml-1">curtidas</span>
            </div>
          </div>
        </div>

        {/* User's Posts */}
        <h3 className="text-lg font-bold text-foreground mb-4">Publicacoes</h3>
        
        {posts.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Este usuario ainda nao fez nenhuma publicacao</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} currentUser={currentUser} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
