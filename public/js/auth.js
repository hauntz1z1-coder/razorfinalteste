// Authentication Functions

// Login com email e senha
async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Erro no login:', error.message);
        return { success: false, error: error.message };
    }
}

// Cadastro com email e senha
async function signUp(email, password, nickname) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nickname: nickname
                }
            }
        });
        
        if (error) throw error;
        
        // Criar perfil do usuário
        if (data.user) {
            await createProfile(data.user.id, nickname);
        }
        
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Erro no cadastro:', error.message);
        return { success: false, error: error.message };
    }
}

// Criar perfil do usuário
async function createProfile(userId, nickname) {
    try {
        const { error } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                nickname: nickname,
                avatar_url: null,
                bio: null
            });
        
        if (error && error.code !== '23505') { // Ignora erro de duplicata
            throw error;
        }
        
        return { success: true };
    } catch (error) {
        console.error('Erro ao criar perfil:', error.message);
        return { success: false, error: error.message };
    }
}

// Logout
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        window.location.href = 'index.html';
        return { success: true };
    } catch (error) {
        console.error('Erro no logout:', error.message);
        return { success: false, error: error.message };
    }
}

// Obter perfil do usuário
async function getProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        return { success: true, profile: data };
    } catch (error) {
        console.error('Erro ao buscar perfil:', error.message);
        return { success: false, error: error.message };
    }
}

// Atualizar perfil
async function updateProfile(userId, updates) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, profile: data };
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error.message);
        return { success: false, error: error.message };
    }
}

// Verificar se usuário está autenticado
async function requireAuth() {
    const session = await checkSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    return session.user;
}
