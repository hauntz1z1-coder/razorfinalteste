// ===== PAINEL ADMINISTRATIVO RAZOR =====
// Funções de gerenciamento de usuários, posts e candidaturas

// Verificar se é admin
async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
    
    if (!profile || !profile.is_admin) {
        alert('Acesso negado. Você não tem permissão de administrador.');
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// ===== GERENCIAMENTO DE USUÁRIOS =====

async function loadUsers() {
    const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Erro ao carregar usuários:', error);
        return;
    }
    
    const container = document.getElementById('users-list');
    if (!container) return;
    
    if (!users || users.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum usuário cadastrado.</p>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="admin-card user-card ${user.is_banned ? 'banned' : ''}" data-user-id="${user.id}">
            <div class="user-info">
                <div class="user-avatar">
                    ${user.avatar_url 
                        ? `<img src="${user.avatar_url}" alt="${user.username || 'Usuário'}">` 
                        : `<div class="avatar-placeholder">${(user.username || user.display_name || 'U')[0].toUpperCase()}</div>`
                    }
                </div>
                <div class="user-details">
                    <h3>${user.display_name || user.username || 'Sem nome'}</h3>
                    <p class="username">@${user.username || 'sem-username'}</p>
                    <p class="user-meta">
                        ${user.is_admin ? '<span class="badge admin-badge">ADMIN</span>' : ''}
                        ${user.is_banned ? '<span class="badge banned-badge">BANIDO</span>' : ''}
                    </p>
                    <p class="user-date">Criado em: ${new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
                    ${user.ban_reason ? `<p class="ban-reason">Motivo do ban: ${user.ban_reason}</p>` : ''}
                </div>
            </div>
            <div class="user-actions">
                ${!user.is_banned 
                    ? `<button class="btn btn-danger btn-sm" onclick="banUser('${user.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                        </svg>
                        Banir
                       </button>`
                    : `<button class="btn btn-success btn-sm" onclick="unbanUser('${user.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Desbanir
                       </button>`
                }
                ${!user.is_admin 
                    ? `<button class="btn btn-primary btn-sm" onclick="makeAdmin('${user.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                        </svg>
                        Tornar Admin
                       </button>`
                    : ''
                }
            </div>
        </div>
    `).join('');
}

async function banUser(userId) {
    const reason = prompt('Motivo do banimento:');
    if (!reason) return;
    
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    const { error } = await supabase
        .from('profiles')
        .update({
            is_banned: true,
            ban_reason: reason,
            banned_at: new Date().toISOString(),
            banned_by: admin.id
        })
        .eq('id', userId);
    
    if (error) {
        alert('Erro ao banir usuário: ' + error.message);
        return;
    }
    
    // Log da ação
    await logModerationAction('ban_user', userId, null, null, { reason });
    
    alert('Usuário banido com sucesso!');
    loadUsers();
}

async function unbanUser(userId) {
    if (!confirm('Tem certeza que deseja desbanir este usuário?')) return;
    
    const { error } = await supabase
        .from('profiles')
        .update({
            is_banned: false,
            ban_reason: null,
            banned_at: null,
            banned_by: null
        })
        .eq('id', userId);
    
    if (error) {
        alert('Erro ao desbanir usuário: ' + error.message);
        return;
    }
    
    await logModerationAction('unban_user', userId, null, null, {});
    
    alert('Usuário desbanido com sucesso!');
    loadUsers();
}

async function makeAdmin(userId) {
    if (!confirm('Tem certeza que deseja tornar este usuário um administrador?')) return;
    
    const { error } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', userId);
    
    if (error) {
        alert('Erro ao promover usuário: ' + error.message);
        return;
    }
    
    await logModerationAction('make_admin', userId, null, null, {});
    
    alert('Usuário promovido a administrador!');
    loadUsers();
}

// ===== GERENCIAMENTO DE POSTS =====

async function loadAllPosts() {
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            profiles:user_id (username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Erro ao carregar posts:', error);
        return;
    }
    
    const container = document.getElementById('posts-list');
    if (!container) return;
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum post encontrado.</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="admin-card post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-author">
                    ${post.profiles?.avatar_url 
                        ? `<img src="${post.profiles.avatar_url}" alt="${post.profiles?.username}" class="author-avatar">` 
                        : `<div class="avatar-placeholder">${(post.profiles?.username || 'U')[0].toUpperCase()}</div>`
                    }
                    <div>
                        <span class="author-name">${post.profiles?.display_name || post.profiles?.username || 'Usuário'}</span>
                        <span class="post-date">${new Date(post.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                </div>
            </div>
            <div class="post-content">
                <p>${post.content}</p>
                ${post.image_url ? `<img src="${post.image_url}" alt="Imagem do post" class="post-image">` : ''}
            </div>
            <div class="post-actions">
                <button class="btn btn-danger btn-sm" onclick="deletePost('${post.id}', '${post.user_id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Excluir Post
                </button>
                <button class="btn btn-warning btn-sm" onclick="banUserFromPost('${post.user_id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                    Banir Autor
                </button>
            </div>
        </div>
    `).join('');
}

async function deletePost(postId, userId) {
    const reason = prompt('Motivo da exclusão:');
    if (!reason) return;
    
    // Primeiro, deletar os likes associados
    await supabase.from('likes').delete().eq('post_id', postId);
    
    // Depois, deletar o post
    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
    
    if (error) {
        alert('Erro ao excluir post: ' + error.message);
        return;
    }
    
    await logModerationAction('delete_post', userId, postId, null, { reason });
    
    alert('Post excluído com sucesso!');
    loadAllPosts();
}

async function banUserFromPost(userId) {
    banUser(userId);
}

// ===== GERENCIAMENTO DE CANDIDATURAS =====

async function loadCandidaturas() {
    const { data: candidaturas, error } = await supabase
        .from('candidaturas')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Erro ao carregar candidaturas:', error);
        return;
    }
    
    const container = document.getElementById('candidaturas-list');
    if (!container) return;
    
    if (!candidaturas || candidaturas.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhuma candidatura encontrada.</p>';
        return;
    }
    
    container.innerHTML = candidaturas.map(c => `
        <div class="admin-card candidatura-card ${c.status}" data-candidatura-id="${c.id}">
            <div class="candidatura-header">
                <div class="candidatura-info">
                    <h3>${c.nome}</h3>
                    <p class="discord-info">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                        </svg>
                        ${c.discord_username}
                    </p>
                </div>
                <span class="status-badge status-${c.status}">${c.status.toUpperCase()}</span>
            </div>
            <div class="candidatura-body">
                <div class="info-row">
                    <strong>Idade:</strong> ${c.idade || 'Não informado'}
                </div>
                <div class="info-row">
                    <strong>Jogos Principais:</strong> ${c.jogos_principais || 'Não informado'}
                </div>
                <div class="info-row">
                    <strong>Experiência:</strong> ${c.experiencia || 'Não informado'}
                </div>
                <div class="info-row">
                    <strong>Por que quer entrar:</strong> ${c.porque_entrar || 'Não informado'}
                </div>
                <div class="info-row">
                    <strong>Enviado em:</strong> ${new Date(c.created_at).toLocaleString('pt-BR')}
                </div>
                ${c.admin_notes ? `<div class="info-row admin-notes"><strong>Notas Admin:</strong> ${c.admin_notes}</div>` : ''}
            </div>
            ${c.status === 'pendente' ? `
                <div class="candidatura-actions">
                    <button class="btn btn-success" onclick="aprovarCandidatura('${c.id}', '${c.nome}', '${c.discord_username}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Aprovar e Criar Conta
                    </button>
                    <button class="btn btn-danger" onclick="rejeitarCandidatura('${c.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Rejeitar
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function aprovarCandidatura(candidaturaId, nome, discordUsername) {
    // Gerar credenciais
    const email = prompt('Digite o email para a conta:', `${discordUsername.replace(/[^a-zA-Z0-9]/g, '')}@razor.team`);
    if (!email) return;
    
    const password = prompt('Digite a senha temporária:', generatePassword());
    if (!password) return;
    
    const username = prompt('Digite o username:', discordUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());
    if (!username) return;
    
    // Atualizar status da candidatura
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    const { error: updateError } = await supabase
        .from('candidaturas')
        .update({
            status: 'aprovado',
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
            admin_notes: `Conta criada: ${email}`
        })
        .eq('id', candidaturaId);
    
    if (updateError) {
        alert('Erro ao atualizar candidatura: ' + updateError.message);
        return;
    }
    
    await logModerationAction('approve_application', null, null, candidaturaId, { email, username });
    
    // Mostrar credenciais para o admin copiar
    const credenciais = `
CANDIDATURA APROVADA!

Envie estas credenciais para ${nome} no Discord (${discordUsername}):

Email: ${email}
Senha: ${password}

Peça para alterar a senha após o primeiro login.
    `;
    
    alert(credenciais);
    
    // Copiar para clipboard se possível
    try {
        await navigator.clipboard.writeText(`Email: ${email}\nSenha: ${password}`);
        alert('Credenciais copiadas para a área de transferência!');
    } catch (e) {
        console.log('Não foi possível copiar automaticamente');
    }
    
    loadCandidaturas();
}

async function rejeitarCandidatura(candidaturaId) {
    const reason = prompt('Motivo da rejeição (opcional):');
    
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    const { error } = await supabase
        .from('candidaturas')
        .update({
            status: 'rejeitado',
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString(),
            admin_notes: reason || 'Rejeitado sem motivo específico'
        })
        .eq('id', candidaturaId);
    
    if (error) {
        alert('Erro ao rejeitar candidatura: ' + error.message);
        return;
    }
    
    await logModerationAction('reject_application', null, null, candidaturaId, { reason });
    
    alert('Candidatura rejeitada.');
    loadCandidaturas();
}

// ===== CRIAR CONTA MANUAL =====

async function criarContaManual(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;
    const username = form.username.value;
    const displayName = form.display_name.value;
    
    // Nota: Para criar usuários pelo admin, você precisaria de uma Edge Function
    // ou usar o Supabase Admin SDK no backend.
    // Por enquanto, mostraremos as instruções
    
    const instrucoes = `
Para criar uma conta manualmente, execute no SQL Editor do Supabase:

-- Após criar o usuário via Dashboard > Authentication > Users > Add User
-- Execute este comando para criar o perfil:

INSERT INTO public.profiles (id, username, display_name)
VALUES ('USER_ID_AQUI', '${username}', '${displayName}');

Ou use o Dashboard do Supabase:
1. Vá em Authentication > Users
2. Clique em "Add User"
3. Preencha email (${email}) e senha (${password})
4. O perfil será criado automaticamente pelo trigger
    `;
    
    alert(instrucoes);
    form.reset();
}

// ===== LOGS DE MODERAÇÃO =====

async function logModerationAction(action, targetUserId, targetPostId, targetCandidaturaId, details) {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('moderation_logs').insert({
        admin_id: user.id,
        action,
        target_user_id: targetUserId,
        target_post_id: targetPostId,
        target_candidatura_id: targetCandidaturaId,
        details
    });
}

async function loadModerationLogs() {
    const { data: logs, error } = await supabase
        .from('moderation_logs')
        .select(`
            *,
            admin:admin_id (username, display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
    
    if (error) {
        console.error('Erro ao carregar logs:', error);
        return;
    }
    
    const container = document.getElementById('logs-list');
    if (!container) return;
    
    if (!logs || logs.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum log de moderação.</p>';
        return;
    }
    
    const actionLabels = {
        'ban_user': 'Baniu usuário',
        'unban_user': 'Desbaniu usuário',
        'make_admin': 'Promoveu a admin',
        'delete_post': 'Excluiu post',
        'approve_application': 'Aprovou candidatura',
        'reject_application': 'Rejeitou candidatura'
    };
    
    container.innerHTML = logs.map(log => `
        <div class="log-entry">
            <div class="log-icon ${log.action}">
                ${getActionIcon(log.action)}
            </div>
            <div class="log-content">
                <p><strong>${log.admin?.display_name || log.admin?.username || 'Admin'}</strong> ${actionLabels[log.action] || log.action}</p>
                ${log.details?.reason ? `<p class="log-detail">Motivo: ${log.details.reason}</p>` : ''}
                <span class="log-date">${new Date(log.created_at).toLocaleString('pt-BR')}</span>
            </div>
        </div>
    `).join('');
}

function getActionIcon(action) {
    const icons = {
        'ban_user': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>',
        'unban_user': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        'make_admin': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>',
        'delete_post': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
        'approve_application': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>',
        'reject_application': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>'
    };
    return icons[action] || '';
}

// ===== ESTATÍSTICAS =====

async function loadStats() {
    // Total de usuários
    const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    
    // Usuários banidos
    const { count: bannedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_banned', true);
    
    // Total de posts
    const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });
    
    // Candidaturas pendentes
    const { count: pendingCount } = await supabase
        .from('candidaturas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');
    
    document.getElementById('stat-users').textContent = usersCount || 0;
    document.getElementById('stat-banned').textContent = bannedCount || 0;
    document.getElementById('stat-posts').textContent = postsCount || 0;
    document.getElementById('stat-pending').textContent = pendingCount || 0;
}

// ===== UTILIDADES =====

function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// ===== NAVEGAÇÃO ENTRE ABAS =====

function showTab(tabName) {
    // Esconder todas as seções
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover active dos links
    document.querySelectorAll('.admin-nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    document.getElementById(`section-${tabName}`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Carregar dados da seção
    switch(tabName) {
        case 'dashboard':
            loadStats();
            break;
        case 'users':
            loadUsers();
            break;
        case 'posts':
            loadAllPosts();
            break;
        case 'candidaturas':
            loadCandidaturas();
            break;
        case 'logs':
            loadModerationLogs();
            break;
    }
}

// ===== INICIALIZAÇÃO =====

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar acesso admin
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) return;
    
    // Carregar estatísticas iniciais
    loadStats();
    
    // Setup navegação
    document.querySelectorAll('.admin-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab');
            showTab(tab);
        });
    });
    
    // Setup formulário de criar conta
    const createUserForm = document.getElementById('create-user-form');
    if (createUserForm) {
        createUserForm.addEventListener('submit', criarContaManual);
    }
});
