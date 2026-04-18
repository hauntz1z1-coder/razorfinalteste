'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface CreatePostFormProps {
  user: User
}

export default function CreatePostForm({ user }: CreatePostFormProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) return
    
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('posts')
      .insert({
        content: content.trim(),
        user_id: user.id,
      })

    if (error) {
      console.log('[v0] Error creating post:', error)
      setError('Erro ao publicar. Tente novamente.')
    } else {
      setContent('')
    }
    
    setLoading(false)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que esta acontecendo na RAZOR?"
          className="w-full bg-transparent text-foreground placeholder-muted-foreground resize-none border-none focus:outline-none text-base min-h-[80px]"
          maxLength={500}
        />
        
        {error && (
          <p className="text-destructive text-sm mb-3">{error}</p>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {content.length}/500
          </span>
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="bg-primary text-primary-foreground font-bold py-2 px-6 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
          >
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </form>
    </div>
  )
}
