// Feed Social Functions

// Buscar todos os posts
async function getPosts() {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles:user_id (
                    nickname,
                    avatar_url
                ),
                likes (
                    user_id
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return { success: true, posts: data };
    } catch (error) {
        console.error('Erro ao buscar posts:', error.message);
        return { success: false, error: error.message };
    }
}

// Criar novo post
async function createPost(content) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        const { data, error } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                content: content
            })
            .select(`
                *,
                profiles:user_id (
                    nickname,
                    avatar_url
                )
            `)
            .single();
        
        if (error) throw error;
        
        return { success: true, post: data };
    } catch (error) {
        console.error('Erro ao criar post:', error.message);
        return { success: false, error: error.message };
    }
}

// Deletar post
async function deletePost(postId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('Erro ao deletar post:', error.message);
        return { success: false, error: error.message };
    }
}

// Dar like em um post
async function likePost(postId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        const { error } = await supabase
            .from('likes')
            .insert({
                post_id: postId,
                user_id: user.id
            });
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('Erro ao dar like:', error.message);
        return { success: false, error: error.message };
    }
}

// Remover like de um post
async function unlikePost(postId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        const { error } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('Erro ao remover like:', error.message);
        return { success: false, error: error.message };
    }
}

// Toggle like
async function toggleLike(postId) {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Verificar se já deu like
    const { data } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
    
    if (data) {
        return await unlikePost(postId);
    } else {
        return await likePost(postId);
    }
}

// Formatar data relativa
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'agora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString('pt-BR');
}

// Renderizar um post
function renderPost(post, currentUserId) {
    const isLiked = post.likes?.some(like => like.user_id === currentUserId);
    const likesCount = post.likes?.length || 0;
    const isOwner = post.user_id === currentUserId;
    const nickname = post.profiles?.nickname || 'Anônimo';
    const avatarUrl = post.profiles?.avatar_url || 'https://via.placeholder.com/48';
    
    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-author">
                    <img src="${avatarUrl}" alt="${nickname}" class="author-avatar" onerror="this.src='https://via.placeholder.com/48'">
                    <div class="author-info">
                        <a href="perfil.html?id=${post.user_id}" class="author-name">${nickname}</a>
                        <span class="post-time">${formatRelativeTime(post.created_at)}</span>
                    </div>
                </div>
                ${isOwner ? `
                    <button class="post-menu-btn" onclick="deletePostHandler('${post.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                    </button>
                ` : ''}
            </div>
            <div class="post-content">
                <p>${escapeHtml(post.content)}</p>
            </div>
            <div class="post-actions">
                <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="handleLike('${post.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                    <span class="likes-count">${likesCount}</span>
                </button>
            </div>
        </div>
    `;
}

// Escape HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handler para deletar post
async function deletePostHandler(postId) {
    if (confirm('Tem certeza que deseja deletar este post?')) {
        const result = await deletePost(postId);
        if (result.success) {
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) {
                postElement.remove();
            }
        } else {
            alert('Erro ao deletar post');
        }
    }
}

// Handler para like
async function handleLike(postId) {
    const result = await toggleLike(postId);
    if (result && result.success) {
        // Recarregar posts para atualizar contagem
        loadFeed();
    }
}

// Carregar feed
async function loadFeed() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;
    
    feedContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Carregando posts...</p></div>';
    
    const user = await getCurrentUser();
    const result = await getPosts();
    
    if (result.success) {
        if (result.posts.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-feed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>Nenhum post ainda. Seja o primeiro a postar!</p>
                </div>
            `;
        } else {
            feedContainer.innerHTML = result.posts.map(post => renderPost(post, user?.id)).join('');
        }
    } else {
        feedContainer.innerHTML = `
            <div class="error-message">
                <p>Erro ao carregar posts. Tente novamente.</p>
                <button class="btn btn-primary btn-small" onclick="loadFeed()">Tentar novamente</button>
            </div>
        `;
    }
}

// Configurar Realtime
function setupRealtime() {
    supabase
        .channel('public:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
            loadFeed();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
            loadFeed();
        })
        .subscribe();
}
