'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PostCard from '@/components/feed/post-card'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  username: string
  email: string
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

export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setUsername(profileData.username || '')
        setBio(profileData.bio || '')
      }

      // Fetch user's posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (username, avatar_url),
          likes (user_id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (postsData) {
        setPosts(postsData)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username,
        bio,
        email: user.email,
      })

    if (error) {
      console.log('[v0] Error updating profile:', error)
    } else {
      setProfile((prev) => prev ? { ...prev, username, bio } : null)
      setEditing(false)
    }

    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Carregando...</div>
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
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Perfil</span>
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
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Card */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-bold text-2xl">
                  {profile?.username?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </div>

            <div className="flex-1">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Nome de Usuario
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      rows={3}
                      maxLength={160}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-all text-sm"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false)
                        setUsername(profile?.username || '')
                        setBio(profile?.bio || '')
                      }}
                      className="bg-muted text-muted-foreground font-medium py-2 px-4 rounded-md hover:bg-muted/80 transition-all text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-foreground">
                      {profile?.username || 'Usuario'}
                    </h2>
                    <button
                      onClick={() => setEditing(true)}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      Editar
                    </button>
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">
                    {user?.email}
                  </p>
                  {profile?.bio && (
                    <p className="text-foreground">{profile.bio}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Membro desde {new Date(profile?.created_at || '').toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </>
              )}
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
              <span className="text-muted-foreground text-sm ml-1">curtidas recebidas</span>
            </div>
          </div>
        </div>

        {/* User's Posts */}
        <h3 className="text-lg font-bold text-foreground mb-4">Suas Publicacoes</h3>
        
        {posts.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground mb-4">Voce ainda nao fez nenhuma publicacao</p>
            <Link
              href="/feed"
              className="inline-block bg-primary text-primary-foreground font-bold py-2 px-6 rounded-md hover:bg-primary/90 transition-all"
            >
              Ir para o Feed
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} currentUser={user} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
