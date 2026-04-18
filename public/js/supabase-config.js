// Supabase Configuration
// IMPORTANTE: Substitua essas variáveis pelas suas credenciais do Supabase
// Você pode encontrá-las em: https://app.supabase.com/project/YOUR_PROJECT/settings/api

const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Ex: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Sua chave anônima

// Inicializa o cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função helper para verificar se está configurado
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

// Função para obter usuário atual
async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return user;
}

// Função para verificar sessão
async function checkSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return session;
}

// Listener para mudanças de autenticação
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        console.log('Usuário logado:', session.user.email);
        updateAuthUI(true, session.user);
    } else if (event === 'SIGNED_OUT') {
        console.log('Usuário deslogado');
        updateAuthUI(false, null);
    }
});

// Atualiza UI baseado no estado de autenticação
function updateAuthUI(isLoggedIn, user) {
    const authLinks = document.querySelectorAll('.auth-link');
    const userMenus = document.querySelectorAll('.user-menu');
    const userNames = document.querySelectorAll('.user-name');
    
    authLinks.forEach(link => {
        link.style.display = isLoggedIn ? 'none' : 'inline-flex';
    });
    
    userMenus.forEach(menu => {
        menu.style.display = isLoggedIn ? 'inline-flex' : 'none';
    });
    
    if (user && userNames.length > 0) {
        const displayName = user.user_metadata?.nickname || user.email?.split('@')[0] || 'Usuário';
        userNames.forEach(el => el.textContent = displayName);
    }
}

// Inicializa verificação de sessão quando página carrega
document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkSession();
    updateAuthUI(!!session, session?.user);
});
