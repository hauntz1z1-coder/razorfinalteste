'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
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

interface PostCardProps {
  post: Post
  currentUser: User | null
}

export default function PostCard({ post, currentUser }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(
    currentUser ? post.likes.some((like) => like.user_id === currentUser.id) : false
  )
  const [likesCount, setLikesCount] = useState(post.likes.length)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleLike = async () => {
    if (!currentUser || loading) return

    setLoading(true)

    if (isLiked) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUser.id)

      if (!error) {
        setIsLiked(false)
        setLikesCount((prev) => prev - 1)
      }
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: post.id,
          user_id: currentUser.id,
        })

      if (!error) {
        setIsLiked(true)
        setLikesCount((prev) => prev + 1)
      }
    }

    setLoading(false)
  }

  const handleDelete = async () => {
    if (!currentUser || post.user_id !== currentUser.id) return

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id)

    if (error) {
      console.log('[v0] Error deleting post:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'agora'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  }

  return (
    <article className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
            {post.profiles?.avatar_url ? (
              <img
                src={post.profiles.avatar_url}
                alt={post.profiles.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-primary font-bold text-sm">
                {post.profiles?.username?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </div>
          <div>
            <Link
              href={`/perfil/${post.user_id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              {post.profiles?.username || 'Usuario'}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatDate(post.created_at)}
            </p>
          </div>
        </div>

        {currentUser?.id === post.user_id && (
          <button
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            title="Excluir"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <p className="text-foreground whitespace-pre-wrap mb-4 leading-relaxed">
        {post.content}
      </p>

      {post.image_url && (
        <img
          src={post.image_url}
          alt="Post image"
          className="w-full rounded-lg mb-4 object-cover max-h-96"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 pt-3 border-t border-border">
        <button
          onClick={handleLike}
          disabled={!currentUser}
          className={`flex items-center gap-2 transition-colors ${
            isLiked ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          } ${!currentUser ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <svg
            className="w-5 h-5"
            fill={isLiked ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="text-sm font-medium">{likesCount}</span>
        </button>
      </div>
    </article>
  )
}
