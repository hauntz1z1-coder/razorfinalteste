'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PostCard from '@/components/feed/post-card'
import CreatePostForm from '@/components/feed/create-post-form'
import FeedHeader from '@/components/feed/feed-header'
import type { User } from '@supabase/supabase-js'

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

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (username, avatar_url),
          likes (user_id)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.log('[v0] Error fetching posts:', error)
      } else {
        setPosts(data || [])
      }
      setLoading(false)
    }

    fetchPosts()

    // Setup realtime subscription
    const channel = supabase
      .channel('posts-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new post with profile
            const { data } = await supabase
              .from('posts')
              .select(`
                *,
                profiles (username, avatar_url),
                likes (user_id)
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setPosts((prev) => [data, ...prev])
            }
          } else if (payload.eventType === 'DELETE') {
            setPosts((prev) => prev.filter((post) => post.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        async () => {
          // Refetch posts to update like counts
          const { data } = await supabase
            .from('posts')
            .select(`
              *,
              profiles (username, avatar_url),
              likes (user_id)
            `)
            .order('created_at', { ascending: false })
          
          if (data) {
            setPosts(data)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <FeedHeader user={user} onLogout={handleLogout} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {user && <CreatePostForm user={user} />}

        {!user && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6 text-center">
            <p className="text-muted-foreground mb-4">
              Faca login para publicar e interagir com a comunidade
            </p>
            <Link
              href="/auth/login"
              className="inline-block bg-primary text-primary-foreground font-bold py-2 px-6 rounded-md hover:bg-primary/90 transition-all"
            >
              Entrar
            </Link>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                </div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma publicacao ainda. Seja o primeiro a postar!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={user}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
