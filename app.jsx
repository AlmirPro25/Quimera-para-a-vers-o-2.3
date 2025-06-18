```jsx
// @jsx React.createElement
// CTO: Protocolo Quimera v2.3 - Edição Aprimorada.
// Diretiva: Implementar melhorias de usabilidade, performance e capacidade analítica.

// --- Considerações para Ambiente de Produção (Frontend) ---
// Testes: Em um ambiente de produção, seria essencial adicionar testes unitários para componentes React,
// testes de integração para fluxos de usuário e testes E2E (End-to-End) usando ferramentas como Cypress
// ou Playwright para garantir a estabilidade da UI em diversos cenários.
// Segurança: Embora o backend seja responsável pela maior parte da segurança, no frontend, medidas como
// validação de entrada robusta (mesmo que duplicada no backend), sanitização de HTML ao renderizar
// conteúdo gerado pelo usuário (para prevenir XSS), e o uso de Content Security Policy (CSP) são cruciais.
// Tratamento de Erros: A interface do usuário deve fornecer feedback claro e amigável para o usuário
// em caso de erros de API ou falhas de componentes, evitando travar a aplicação e guiando o usuário.
// O sistema de Toast já ajuda nisso.
// Otimização de Performance: Para aplicações React maiores, técnicas como code splitting (React.lazy),
// lazy loading de imagens, virtualização de listas, e otimizações de bundle com Webpack/Rollup seriam
// implementadas para reduzir o tempo de carregamento inicial e melhorar a fluidez.

const { useState, useEffect, useContext, createContext, useMemo, useCallback, Fragment, useRef } = React;
const Chart = window.ReactApexcharts; // Acessa o wrapper React do ApexCharts do CDN global
const Papa = window.Papa; // Acessa o PapaParse do CDN global

// --- CONTEXTO DE CONFIGURAÇÕES (NOVO para Temas) ---
const SettingsContext = createContext(null);
const useSettings = () => useContext(SettingsContext);

function SettingsProvider({ children }) {
    const [theme, setTheme] = useState(localStorage.getItem('chimera_theme') || 'dark');

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'high-contrast') {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }
        localStorage.setItem('chimera_theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(current => current === 'dark' ? 'high-contrast' : 'dark');
    }, []);

    const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

    return (
        <SettingsContext.Provider value={value} data-aid="provider-settings-pS1d2">
            {children}
        </SettingsContext.Provider>
    );
}

// --- SERVIÇO DE TOAST (NOTIFICAÇÕES) ---
const ToastContext = createContext(null);
const useToasts = () => useContext(ToastContext);

function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(current => current.filter(t => t.id !== id)), 5000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(current => current.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={addToast} data-aid="provider-toast-pT1e3">
            {children}
            <div id="toast-container" className="fixed top-5 right-5 z-50 space-y-3" data-aid="div-toastContainer-tC2d3">
                {toasts.map(toast => (
                    <div key={toast.id}
                         className={`bg-gray-800 text-white p-3 rounded-lg shadow-lg flex items-center space-x-3 transition-all duration-300 ease-out transform ${
                            toast.type === 'success' ? 'border-l-4 border-green-500' :
                            toast.type === 'error' ? 'border-l-4 border-red-500' :
                            toast.type === 'warning' ? 'border-l-4 border-yellow-500' :
                            'border-l-4 border-blue-500'
                         } fade-in`}
                         data-aid={`div-toast-${toast.id}`}
                    >
                        {toast.type === 'success' && <i className="fas fa-check-circle text-green-400" data-aid={`i-toastIcon-success-${toast.id}`}></i>}
                        {toast.type === 'error' && <i className="fas fa-exclamation-circle text-red-400" data-aid={`i-toastIcon-error-${toast.id}`}></i>}
                        {toast.type === 'warning' && <i className="fas fa-exclamation-triangle text-yellow-400" data-aid={`i-toastIcon-warning-${toast.id}`}></i>}
                        {toast.type === 'info' && <i className="fas fa-info-circle text-blue-400" data-aid={`i-toastIcon-info-${toast.id}`}></i>}
                        <span className="flex-grow" data-aid={`span-toastMessage-${toast.id}`}>{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-white" data-aid={`btn-closeToast-${toast.id}`}>
                            <i className="fas fa-times" data-aid={`i-closeToastIcon-${toast.id}`}></i>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// --- SERVIÇO DE API ---
const apiService = {
    baseUrl: 'http://localhost:8080/api',
    getToken: () => localStorage.getItem('chimera_token'),
    getHeaders: () => {
        const headers = { 'Content-Type': 'application/json' };
        const token = apiService.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },
    login: async (username, password) => {
        const r = await fetch(`${apiService.baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        if (!r.ok) {
            const e = await r.json(); throw new Error(e.message || 'Falha de Autenticação');
        }
        return r.json();
    },
    fetchData: async (endpoint) => {
        const r = await fetch(`${apiService.baseUrl}${endpoint}`, { headers: apiService.getHeaders() });
        if (r.status === 401 || r.status === 403) window.dispatchEvent(new Event('auth-error'));
        if (!r.ok) {
            const errorData = await r.json();
            throw new Error(errorData.message || `Erro na transmissão de dados: ${r.status}`);
        }
        if (r.status === 204) return null;
        return r.json();
    },
    postData: async (endpoint, body) => {
        const r = await fetch(`${apiService.baseUrl}${endpoint}`, { method: 'POST', headers: apiService.getHeaders(), body: JSON.stringify(body) });
        if (r.status === 401 || r.status === 403) window.dispatchEvent(new Event('auth-error'));
        if (!r.ok) {
            const e = await r.json(); throw new Error(e.message || `Falha na requisição: ${r.status}`);
        }
        return r.json();
    },
    putData: async (endpoint, body) => {
        const r = await fetch(`${apiService.baseUrl}${endpoint}`, { method: 'PUT', headers: apiService.getHeaders(), body: JSON.stringify(body) });
        if (r.status === 401 || r.status === 403) window.dispatchEvent(new Event('auth-error'));
        if (!r.ok) {
            const e = await r.json(); throw new Error(e.message || `Falha na atualização: ${r.status}`);
        }
        return r.json();
    }
};

// --- Contextos e Hooks (Auth, WebSocket, useInitialData) ---
const AuthContext = createContext(null);
function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('chimera_token'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const addToast = useToasts();

    useEffect(() => {
        const handleAuthError = () => {
            logout();
            addToast('Sessão expirada. Por favor, autentique novamente.', 'warning');
        };
        window.addEventListener('auth-error', handleAuthError);
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({ username: payload.username, role: payload.role });
            } catch (e) {
                console.error("Invalid token format:", e);
                logout();
            }
        }
        setLoading(false);
        return () => window.removeEventListener('auth-error', handleAuthError);
    }, [token, addToast]);

    const login = useCallback(async (username, password) => {
        const data = await apiService.login(username, password);
        localStorage.setItem('chimera_token', data.token);
        setToken(data.token);
        setUser(data.user);
        addToast(`Bem-vindo, Operador ${data.user.username}.`, 'success');
    }, [addToast]);

    const logout = useCallback(() => {
        localStorage.removeItem('chimera_token');
        setToken(null);
        setUser(null);
        addToast('Sessão encerrada.', 'info');
    }, [addToast]);

    const value = useMemo(() => ({ token, user, loading, login, logout }), [token, user, loading, login, logout]);
    return <AuthContext.Provider value={value} data-aid="provider-auth-pA1b2">{children}</AuthContext.Provider>;
}
const useAuth = () => useContext(AuthContext);

const WebSocketContext = createContext(null);
function WebSocketProvider({ children }) {
    const [lastMessage, setLastMessage] = useState(null);
    const { token } = useAuth();
    const ws = useRef(null);
    useEffect(() => {
        if (token && !ws.current) {
            const wsUrl = `ws://localhost:8080?token=${token}&type=ui`;
            ws.current = new WebSocket(wsUrl);
            ws.current.onopen = () => console.log('Conexão WebSocket da UI estabelecida.');
            ws.current.onmessage = (event) => {
                const message = JSON.parse(event.data);
                setLastMessage({ ...message, id: Date.now() });
            };
            ws.current.onerror = (error) => console.error('Erro no WebSocket:', error);
            ws.current.onclose = () => {
                console.log('Conexão WebSocket da UI fechada.');
                ws.current = null;
            };
        }
        return () => { if (ws.current) { ws.current.close(); } };
    }, [token]);
    return (
        <WebSocketContext.Provider value={{ lastMessage }} data-aid="provider-websocket-pWs1c3">
            {children}
        </WebSocketContext.Provider>
    );
}
const useWebSocket = () => useContext(WebSocketContext);

function useInitialData(endpoint) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let isMounted = true;
        apiService.fetchData(endpoint).then(result => {
            if(isMounted) setData(result);
        }).catch(err => {
            if(isMounted) setError(err.message || 'Falha ao buscar dados.');
        }).finally(() => {
            if(isMounted) setLoading(false);
        });
        return () => { isMounted = false; };
    }, [endpoint]);
    return { data, setData, loading, error };
}

const timeAgo = (dateString) => {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " anos atrás";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses atrás";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " dias atrás";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas atrás";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min atrás";
    return Math.floor(seconds) + " seg atrás";
};

function Tooltip({ children, text }) {
    return (
        <div className="tooltip-container" data-aid={`tooltip-container-${text.replace(/\s+/g, '-').slice(0,20).toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`}>
            {children}
            <div className="tooltip-box" role="tooltip" data-aid={`tooltip-box-${text.replace(/\s+/g, '-').slice(0,20).toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`}>
                {text}
            </div>
        </div>
    );
}

function AuthView() {
    const [username, setUsername] = useState('operator');
    const [password, setPassword] = useState('password123');
    const [error, setError] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsConnecting(true);
        try {
            await login(username, password);
        } catch (err) {
            setError(err.message);
            setIsConnecting(false);
        }
    };
    return (
        <div className="min-h-screen flex items-center justify-center p-4 fade-in" data-aid="div-authView-aV1c3">
            <div className="w-full max-w-md command-panel rounded-xl shadow-2xl p-8 space-y-6 border-t-4 border-teal-500" data-aid="div-loginPanel-lP2d4" style={{ animation: "pulse-glow 4s infinite" }}>
                <div className="text-center" data-aid="div-loginHeader-lH3e5">
                    <h1 className="text-5xl font-extrabold text-teal-400 header-glow" data-aid="h1-loginTitle-lT4f6">PROTOCOLO QUIMERA</h1>
                    <p className="text-[var(--text-secondary)] mt-2 text-lg" data-aid="p-loginSubtitle-lS5g7">Interface de Comando Estratégico</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6" data-aid="form-login-lF6h8">
                    <div>
                        <label htmlFor="username" className="block text-md font-medium text-[var(--text-primary)] mb-2" data-aid="label-username-lU7i9">Identificação do Operador</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] text-[var(--text-primary)] transition"
                            required
                            data-aid="input-username-iU8j0"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-md font-medium text-[var(--text-primary)] mb-2" data-aid="label-password-lP9k1">Senha de Acesso</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] text-[var(--text-primary)] transition"
                            required
                            data-aid="input-password-iP0l2"
                        />
                    </div>
                    {error && <p className="text-red-400 text-center text-sm" data-aid="p-loginError-lE1m3"><i className="fas fa-exclamation-circle mr-2" data-aid="i-errorIcon-lI2m4"></i>{error}</p>}
                    <button
                        type="submit"
                        disabled={isConnecting}
                        className="w-full bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] text-white font-bold py-3 px-4 rounded-md transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-teal-500/50 disabled:bg-[var(--btn-disabled-bg)] disabled:scale-100 disabled:cursor-wait"
                        data-aid="btn-submitLogin-sL2n4">
                        {isConnecting ? <><i className="fas fa-spinner fa-spin mr-2" data-aid="i-connectingSpinner-cS1p5"></i>Conectando...</> : 'CONECTAR'}
                    </button>
                    <p className="text-xs text-gray-500 text-center pt-2" data-aid="p-loginHint-lH1m2">Credenciais padrão: operator / password123</p>
                </form>
            </div>
        </div>
    );
}

function Dashboard() {
    const { logout } = useAuth();
    const { theme, toggleTheme } = useSettings();
    const [activeView, setActiveView] = useState('cortex');

    const renderView = () => {
        switch(activeView) {
            case 'analytics': return <AnalyticsDashboardView data-aid="view-analytics-vA1n4" />;
            case 'cortex': return <PredictiveCortexView data-aid="view-cortex-vC5r8" />;
            case 'agents': return <AgentRosterView data-aid="view-agents-vA2n5" />;
            case 'campaigns': return <CampaignManagementView data-aid="view-campaigns-vC3n6" />;
            default: return <PredictiveCortexView data-aid="view-cortex-default-cD4p6" />;
        }
    };

    return (
        <WebSocketProvider>
            <div className="container mx-auto p-4 lg:p-8" data-aid="div-dashboardContainer-dC5q7">
                <header className="flex justify-between items-center mb-8 fade-in" data-aid="header-dashboard-dH6r8">
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-bold header-glow" data-aid="h1-dashTitle-dT7s9">PROTOCOLO QUIMERA v2.3</h1>
                        <p className="text-[var(--text-secondary)] mt-1 text-lg font-semibold" data-aid="p-dashSubtitle-dS8t0">Painel de Operações Preditivas</p>
                    </div>
                    <div className="flex items-center space-x-4" data-aid="div-headerControls-hC1o2">
                         <Tooltip text={theme === 'dark' ? "Ativar Modo de Alto Contraste" : "Desativar Modo de Alto Contraste"}>
                            <button onClick={toggleTheme} className="bg-gray-700/70 hover:bg-gray-600 border border-gray-600 text-white font-bold w-10 h-10 rounded-full transition-all flex items-center justify-center" aria-label="Alternar tema de contraste" data-aid="btn-toggleTheme-tT2p3">
                                <i className="fas fa-adjust" data-aid="i-themeIcon-tI3q4"></i>
                            </button>
                        </Tooltip>
                        <button onClick={logout} className="bg-red-800/70 hover:bg-red-700 border border-red-700 text-white font-bold py-2 px-4 rounded-md transition-all" data-aid="btn-logout-lO9u1">
                           <i className="fas fa-power-off mr-2" data-aid="i-logoutIcon-lI0v2"></i>Encerrar Sessão
                        </button>
                    </div>
                </header>
                <nav className="mb-6 flex justify-center space-x-4 md:space-x-8 text-lg font-semibold fade-in" style={{ animationDelay: '100ms' }} data-aid="nav-dashboard-dN1w3">
                    <button onClick={() => setActiveView('analytics')} className={`nav-tab py-2 px-4 ${activeView === 'analytics' ? 'active' : ''}`} data-aid="btn-tabAnalytics-bA2x4"><i className="fas fa-chart-line mr-2" data-aid="i-analyticsIcon-iA3y5"></i>Agregador de Inteligência</button>
                    <button onClick={() => setActiveView('campaigns')} className={`nav-tab py-2 px-4 ${activeView === 'campaigns' ? 'active' : ''}`} data-aid="btn-tabCampaigns-bC4z6"><i className="fas fa-bullseye mr-2" data-aid="i-campaignsIcon-iC5a7"></i>Campanhas</button>
                    <button onClick={() => setActiveView('agents')} className={`nav-tab py-2 px-4 ${activeView === 'agents' ? 'active' : ''}`} data-aid="btn-tabAgents-bA6b8"><i className="fas fa-users-cog mr-2" data-aid="i-agentsIcon-iA7c9"></i>Agentes</button>
                    <button onClick={() => setActiveView('cortex')} className={`nav-tab py-2 px-4 ${activeView === 'cortex' ? 'active' : ''}`} data-aid="btn-tabCortex-bC3x5"><i className="fas fa-brain mr-2" data-aid="i-cortexIcon-iC4y6"></i>Córtex Preditivo</button>
                </nav>
                <main data-aid="main-dashboard-mD8d0" className="fade-in" style={{ animationDelay: '200ms' }}>
                    {renderView()}
                </main>
            </div>
        </WebSocketProvider>
    );
}

function AnalyticsDashboardView() {
    const { data: initialCampaigns, setData: setCampaigns, loading, error } = useInitialData('/campaigns');
    const [selectedCampaignId, setSelectedCampaignId] = useState(null);
    const { lastMessage } = useWebSocket();

    useEffect(() => {
        if (initialCampaigns && initialCampaigns.length > 0 && !selectedCampaignId) {
            setSelectedCampaignId(initialCampaigns[0].id);
        }
    }, [initialCampaigns, selectedCampaignId]);

    useEffect(() => {
        if (lastMessage?.type === 'campaign-update') {
            apiService.fetchData('/campaigns').then(setCampaigns);
        }
    }, [lastMessage, setCampaigns]);

    if (loading) return <p className="text-center text-lg text-[var(--text-secondary)]" data-aid="p-loadingCampaigns-lC1e2"><i className="fas fa-spinner fa-spin mr-2" data-aid="i-loadCampaignSpinner-lcs12"></i>Carregando diretivas de campanha...</p>;
    if (error) return <p className="text-red-400 text-center text-lg" data-aid="p-errorCampaigns-eC2f3"><i className="fas fa-broadcast-tower mr-2" data-aid="i-errCampaignIcon-eci13"></i>{error}</p>;
    if (!initialCampaigns || initialCampaigns.length === 0) return (
        <div className="command-panel rounded-lg p-8 flex items-center justify-center min-h-[400px] flex-col text-gray-500" data-aid="div-noCampaignsFound-nCF1j2">
            <i className="fas fa-search-dollar text-5xl mb-4" data-aid="i-noCampaignsIcon-iNC2k3"></i>
            <p className="text-lg text-center" data-aid="p-noCampaignsMessage-pNC3l4">Nenhuma campanha ativa encontrada. Crie uma na aba "Campanhas".</p>
        </div>
    );

    return (
        <div className="grid grid-cols-12 gap-6" data-aid="div-analyticsGrid-aG3g4">
            <aside className="col-span-12 lg:col-span-3 command-panel rounded-lg p-4" data-aid="aside-campaignSelector-aS4h5">
                <h2 className="text-xl font-bold text-[var(--text-primary)] border-b-2 border-gray-700 pb-2 mb-4" data-aid="h2-campaignListTitle-cLT5i6">
                    <i className="fas fa-bullseye mr-2 text-violet-400" data-aid="i-campaignsIcon-cI6j7"></i> Campanhas Ativas
                </h2>
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto" data-aid="ul-campaignList-cL7k8">
                    {initialCampaigns.map(campaign => (
                        <li key={campaign.id} data-aid={`li-campaign-${campaign.id}`}>
                            <button
                                onClick={() => setSelectedCampaignId(campaign.id)}
                                className={`w-full text-left list-item p-3 rounded-md campaign-list-item ${selectedCampaignId === campaign.id ? 'selected' : ''}`}
                                data-aid={`btn-selectCampaign-${campaign.id}`}>
                                <p className="font-bold text-[var(--text-primary)]" data-aid={`p-campaignName-${campaign.id}`}>{campaign.name}</p>
                                <p className="text-sm capitalize text-[var(--text-secondary)]" data-aid={`p-campaignStatus-${campaign.id}`}>{campaign.status.toLowerCase()}</p>
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>
            <section className="col-span-12 lg:col-span-9" data-aid="section-analyticsResults-aR8l9">
                {selectedCampaignId && initialCampaigns ?
                    <CampaignAnalytics key={selectedCampaignId} campaign={initialCampaigns.find(c => c.id === selectedCampaignId)} data-aid="component-campaignAnalytics-cAP9n0" /> :
                    <div className="command-panel rounded-lg p-8 flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500" data-aid="div-noCampaignSelected-nCS9m0">
                        <i className="fas fa-lightbulb text-5xl mb-4" data-aid="i-selectCampaignIcon-iSC1o2"></i>
                        <p className="text-lg text-center" data-aid="p-selectCampaignPrompt-sCP0n1">Selecione uma campanha para visualizar a inteligência agregada.</p>
                    </div>
                }
            </section>
        </div>
    );
}

function CampaignAnalytics({ campaign }) {
    const [viewType, setViewType] = useState('sentiment');
    const [widgetKey, setWidgetKey] = useState(Date.now());
    const { lastMessage } = useWebSocket();

    useEffect(() => {
        if (lastMessage?.type === 'mission-result' && lastMessage.payload?.campaignId === campaign.id) {
            setWidgetKey(Date.now());
        }
    }, [lastMessage, campaign.id]);

    const renderAnalyticsWidget = () => {
        const props = { campaignId: campaign.id, key: widgetKey };
        switch (viewType) {
            case 'sentiment': return <SentimentChartWidget {...props} data-aid="widget-sentiment-sW1p2"/>;
            case 'table': return <TableResultsWidget {...props} data-aid="widget-table-tW2q3"/>;
            case 'image': return <ImageGalleryWidget {...props} data-aid="widget-image-iW3r4"/>;
            case 'api': return <ApiStatusWidget {...props} data-aid="widget-api-aW4s5"/>;
            case 'ai_insights': return <AiInsightsWidget {...props} data-aid="widget-aiInsights-aI5t6"/>;
            // MODIFICATION 5: Integrate New Widgets
            case 'browser_screenshots': return <ScreenshotGalleryWidget {...props} data-aid="widget-browserSs-wBSS5u6"/>;
            case 'browser_html': return <HtmlViewerWidget {...props} data-aid="widget-browserHtml-wBHT7v8"/>;
            default: return <p className="text-red-400 text-center py-8" data-aid="p-invalidViewType-iVT5t6">Tipo de visualização inválido.</p>;
        }
    };
    if(!campaign) return null;

    return (
        <div className="command-panel rounded-lg p-6 space-y-6 fade-in min-h-[500px]" data-aid="div-campaignAnalyticsPanel-cAP6u7">
            <header data-aid="header-campaignAnalytics-hCA7v8">
                <h2 className="text-2xl font-bold text-amber-400" data-aid="h2-campaignAnalyticsTitle-cAT8w9">{campaign.name}</h2>
                <p className="text-[var(--text-secondary)] mt-1" data-aid="p-campaignObjective-cO9x0">{campaign.objective}</p>
            </header>
            <nav className="flex flex-wrap space-x-1 bg-gray-900/50 rounded-lg p-1" data-aid="nav-analyticsType-nAT0y1">
                <button onClick={() => setViewType('sentiment')} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-all duration-200 ${viewType === 'sentiment' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700/50'}`} data-aid="btn-viewSentiment-bVS1z2">Sentimento</button>
                <button onClick={() => setViewType('table')} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-all duration-200 ${viewType === 'table' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700/50'}`} data-aid="btn-viewTable-bVT2a3">Tabelas Extraídas</button>
                <button onClick={() => setViewType('image')} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-all duration-200 ${viewType === 'image' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700/50'}`} data-aid="btn-viewImage-bVI3b4">Análise de Imagens</button>
                <button onClick={() => setViewType('api')} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-all duration-200 ${viewType === 'api' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700/50'}`} data-aid="btn-viewApi-bVA4c5">Monitoramento de API</button>
                <button onClick={() => setViewType('ai_insights')} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-all duration-200 ${viewType === 'ai_insights' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700/50'}`} data-aid="btn-viewAiInsights-bAI5c6">Insights de IA</button>
                {/* MODIFICATION 5: Add buttons for new browser widgets */}
                <button onClick={() => setViewType('browser_screenshots')} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-all duration-200 ${viewType === 'browser_screenshots' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700/50'}`} data-aid="btn-viewBrowserSs-bBSS1s2">Screenshots Navegador</button>
                <button onClick={() => setViewType('browser_html')} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-all duration-200 ${viewType === 'browser_html' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700/50'}`} data-aid="btn-viewBrowserHtml-bBHT3t4">HTML Capturado</button>
            </nav>
            <div className="min-h-[400px]" data-aid="div-widgetContainer-wCo5d6">
                {renderAnalyticsWidget()}
            </div>
        </div>
    );
}

function WidgetStatus({ loading, error, data, dataType, children }) {
    if (loading) { return <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 fade-in" data-aid="div-widgetLoading-wL1d1"><i className="fas fa-spinner fa-spin text-4xl text-teal-400" data-aid="i-widgetSpinner-wS2e2"></i><p className="mt-4 text-lg" data-aid="p-widgetLoadingText-wLT3f3">Processando Inteligência...</p></div>; }
    if (error) { return <div className="flex flex-col items-center justify-center h-full text-red-400 p-8 fade-in" data-aid="div-widgetError-wE4g4"><i className="fas fa-exclamation-triangle text-4xl" data-aid="i-widgetErrorIcon-wEI5h5"></i><p className="mt-4 text-lg text-center" data-aid="p-widgetErrorText-wET6i6">{error}</p></div>; }
    if (!data || (Array.isArray(data) && data.length === 0) || (data.series && data.series[0]?.data?.length === 0) || (data.data && data.data.length === 0) || (data.images && data.images.length === 0) || (data.length === 0)) {
        return <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 fade-in" data-aid="div-widgetNoData-wND7j7"><i className="fas fa-folder-open text-4xl" data-aid="i-widgetNoDataIcon-wNI8k8"></i><p className="mt-4 text-lg text-center" data-aid="p-widgetNoDataText-wNT9l9">Nenhum resultado de missão do tipo "{dataType}" encontrado para esta campanha.</p></div>;
    }
    return children;
}
function useAnalyticsData(endpoint) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        apiService.fetchData(endpoint).then(result => {
            if (isMounted) setData(result);
        }).catch(err => {
            if (isMounted) setError(err.message || 'Falha ao buscar dados de análise.');
        }).finally(() => {
            if (isMounted) setLoading(false);
        });
        return () => { isMounted = false; };
    }, [endpoint]);
    return { data, loading, error };
}
function SentimentChartWidget({ campaignId }) {
    const { data, loading, error } = useAnalyticsData(`/analytics/campaign/${campaignId}/sentiment`);
    const chartOptions = {
        chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.2, stops: [0, 90, 100] } },
        xaxis: { type: 'datetime', labels: { style: { colors: 'var(--text-secondary)' } } },
        yaxis: { labels: { style: { colors: 'var(--text-secondary)' }, formatter: (v) => v.toFixed(2) } },
        tooltip: { theme: 'dark' },
        grid: { borderColor: 'rgba(55, 65, 81, 0.5)' },
        theme: { mode: 'dark' },
        colors: ['#f59e0b']
    };
    return (
        <div data-aid="div-sentimentWidget-sW6e7" className="h-full">
            <h3 className="text-lg font-semibold text-gray-300 mb-4" data-aid="h3-sentimentTitle-sT9h0">Tendência de Sentimento</h3>
            <WidgetStatus loading={loading} error={error} data={data?.series?.[0]?.data} dataType="sentimento">
                {Chart && <Chart options={chartOptions} series={data.series} type="area" height="400" data-aid="chart-sentiment-cST1i2" />}
            </WidgetStatus>
        </div>
    );
}

function TableResultsWidget({ campaignId }) {
    const [page, setPage] = useState(1);
    const { data, loading, error } = useAnalyticsData(`/analytics/campaign/${campaignId}/table-results?page=${page}&limit=5`);
    const addToast = useToasts();

    const handleExport = async () => {
        addToast('Preparando dados para exportação...', 'info');
        try {
            const allData = await apiService.fetchData(`/analytics/campaign/${campaignId}/table-results?all=true`);
            if (!allData || !allData.data || !allData.data[0] || !allData.data[0].result) {
                throw new Error("Não foi possível obter os dados completos.");
            }

            const flatData = allData.data.flatMap(execution => execution.result);
            const csv = Papa.unparse(flatData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `campanha_${campaignId}_tabelas_extraidas.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            addToast('Exportação concluída com sucesso.', 'success');
        } catch (err) {
            addToast(`Falha na exportação: ${err.message}`, 'error');
            console.error("Export error:", err);
        }
    };

    const hasNextPage = data && (page * 5 < data.total);
    const hasPrevPage = page > 1;

    return (
        <div data-aid="div-tableWidget-tW8g9" className="h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-300 mb-4" data-aid="h3-tableTitle-tT5n6">Dados Tabulares Extraídos</h3>
            <WidgetStatus loading={loading} error={error} data={data?.data} dataType="extração de tabela">
                <div className="flex-grow overflow-x-auto rounded-lg border border-gray-700 mb-4" data-aid="div-tableContainer-tC1j0">
                    <table className="w-full text-sm text-left text-gray-400" data-aid="table-results-tR2k1">
                        <thead className="text-xs text-[var(--text-primary)] uppercase bg-gray-900/50" data-aid="thead-results-hR3l2">
                            <tr data-aid="tr-header-thr14">
                                {data?.data?.[0]?.result?.[0] && Object.keys(data.data[0].result[0]).map(key =>
                                    <th key={key} scope="col" className="px-6 py-3" data-aid={`th-col-${key.replace(/\s+/g, '')}`}>
                                        {key}
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody data-aid="tbody-results-bR4m3">
                            {data?.data.flatMap((execution, execIndex) => execution.result.map((row, rowIndex) => (
                                <tr key={`${execIndex}-${rowIndex}`} className="bg-gray-800/50 border-b border-gray-700 hover:bg-gray-700/50 transition-colors" data-aid={`tr-row-${execIndex}-${rowIndex}`}>
                                    {Object.values(row).map((value, cellIndex) =>
                                        <td key={cellIndex} className="px-6 py-4" data-aid={`td-cell-${execIndex}-${rowIndex}-${cellIndex}`}>
                                            {String(value)}
                                        </td>
                                    )}
                                </tr>
                            )))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-700" data-aid="div-pagination-pA5n4">
                    <button onClick={handleExport} className="bg-green-700 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-md transition disabled:opacity-50" data-aid="btn-exportCsv-eC1s5">
                        <i className="fas fa-file-csv mr-2" data-aid="i-csvIcon-iC2v6"></i>Exportar CSV
                    </button>
                    <div className="flex items-center space-x-2" data-aid="div-paginationControls-pC7p6">
                        <span className="text-sm text-gray-500" data-aid="span-pageInfo-sPI6o5">Página {page} de {Math.ceil((data?.total || 0) / 5)}</span>
                        <button onClick={() => setPage(p => p - 1)} disabled={!hasPrevPage} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed" data-aid="btn-prevPage-bP8q7">
                            <i className="fas fa-arrow-left" data-aid="i-prevArrow-iP8a7"></i>
                        </button>
                        <button onClick={() => setPage(p => p + 1)} disabled={!hasNextPage} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed" data-aid="btn-nextPage-bN9r8">
                            <i className="fas fa-arrow-right" data-aid="i-nextArrow-iN9b8"></i>
                        </button>
                    </div>
                </div>
            </WidgetStatus>
        </div>
    );
}

function ImageGalleryWidget({ campaignId }) {
    const { data, loading, error } = useAnalyticsData(`/analytics/campaign/${campaignId}/image-results`);
    return (
        <div data-aid="div-imageWidget-iW0i1" className="h-full">
            <h3 className="text-lg font-semibold text-gray-300 mb-4" data-aid="h3-imageTitle-iT1j2">Galeria de Imagens Analisadas</h3>
            <WidgetStatus loading={loading} error={error} data={data?.images} dataType="análise de imagem">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-aid="div-galleryGrid-gG1j2">
                    {data?.images.map((image, index) => (
                        <figure key={index} className="relative group overflow-hidden rounded-lg command-panel p-1 shadow-lg" data-aid={`fig-image-${index}-${campaignId.toString().substring(0,4)}`}>
                            <img
                                src={image.sourceUrl}
                                alt={`Análise de imagem ${index + 1}`}
                                className="w-full h-full object-cover rounded-md transition-transform duration-300 group-hover:scale-110"
                                data-original-prompt={`Image Analysis for Campaign ${campaignId}`}
                                data-aid={`img-result-${index}-${campaignId.toString().substring(0,4)}`}
                            />
                            <figcaption className="absolute inset-0 bg-black/80 text-white p-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-aid={`figcaption-result-${index}-${campaignId.toString().substring(0,4)}`}>
                                <p className="text-center text-sm font-bold" data-aid={`p-logoFound-${index}-${campaignId.toString().substring(0,4)}`}>Logo Detectado: <br /> <span className="text-teal-400 text-lg">{image.result.logoFound}</span></p>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </WidgetStatus>
        </div>
    );
}
function ApiStatusWidget({ campaignId }) {
    const { data, loading, error } = useAnalyticsData(`/analytics/campaign/${campaignId}/api-monitoring`);
    const chartOptions = {
        chart: { type: 'line', stacked: false, toolbar: { show: false }, zoom: { enabled: false } },
        colors: ['#3b82f6', '#10b981'],
        stroke: { width: [3, 3], curve: 'smooth' },
        xaxis: { categories: data?.labels, labels: { style: { colors: 'var(--text-secondary)' } } },
        yaxis: [{ seriesName: 'Response Time (ms)', axisTicks: { show: true }, axisBorder: { show: true, color: '#3b82f6' }, labels: { style: { colors: '#3b82f6' }, formatter: (v) => v.toFixed(0) + 'ms' }, title: { text: "Response Time (ms)", style: { color: '#3b82f6' } } }, { seriesName: 'Status Code', opposite: true, axisTicks: { show: true }, axisBorder: { show: true, color: '#10b981' }, labels: { style: { colors: '#10b981' } }, title: { text: "Status Code", style: { color: '#10b981' } } }],
        tooltip: { theme: 'dark', fixed: { enabled: true, position: 'topLeft', offsetY: 30, offsetX: 60 } },
        grid: { borderColor: 'rgba(55, 65, 81, 0.5)' },
        legend: { position: 'top', horizontalAlign: 'left', offsetX: 40, labels: { colors: 'var(--text-primary)'} },
        theme: { mode: 'dark' }
    };
    return (
        <div data-aid="div-apiWidget-aW2k3" className="h-full">
            <h3 className="text-lg font-semibold text-gray-300 mb-4" data-aid="h3-apiTitle-aT8q9">Monitoramento de API</h3>
            <WidgetStatus loading={loading} error={error} data={data?.series?.[0]?.data} dataType="monitoramento de API">
                {Chart && <Chart options={chartOptions} series={data.series} type="line" height="400" data-aid="chart-api-cAT0r1" />}
            </WidgetStatus>
        </div>
    );
}

function AiInsightsWidget({ campaignId }) {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAiInsights = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiService.fetchData(`/analytics/campaign/${campaignId}/ai-insights`);
                setInsights(response || []);
            } catch (err) {
                setError('Falha ao carregar insights de IA. Verifique se há missões do tipo AI_INSIGHTS concluídas.');
                console.error("Erro ao carregar insights de IA:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAiInsights();
        const interval = setInterval(fetchAiInsights, 20000);
        return () => clearInterval(interval);
    }, [campaignId]);

    return (
        <div data-aid="div-aiInsightsWidget-aIW0j1">
            <h3 className="text-lg font-semibold text-gray-300 mb-4" data-aid="h3-aiInsightsTitle-aIT2k3">Insights Gerados por IA (Gemini)</h3>
            <WidgetStatus loading={loading} error={error} data={insights} dataType="insights de IA">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-aid="div-insightsGrid-iG4l5">
                    {insights.map((insight, idx) => (
                        <div key={idx} className="bg-gray-900 rounded-lg p-4 shadow-lg flex flex-col justify-between" data-aid={`div-insightCard-${idx}-${campaignId.toString().substring(0,4)}`}>
                            <div>
                                <p className="text-sm font-bold text-teal-300 mb-2" data-aid={`p-insightAgentInfo-${idx}`}>
                                    Agente: <span className="font-mono text-xs">{insight.agentHostname || 'N/A'} ({insight.agentId.substring(0,8)}...)</span>
                                    <span className="ml-4 text-gray-500 text-xs">{new Date(insight.timestamp).toLocaleString()}</span>
                                </p>
                                <p className="text-md text-gray-200 mb-3" data-aid={`p-insightObjective-${idx}`}>
                                    <strong className="text-gray-400">Objetivo da Missão:</strong> {insight.objective}
                                </p>
                                <div className="bg-gray-800 p-3 rounded-md border border-gray-700 max-h-48 overflow-y-auto" data-aid={`div-insightContent-${idx}`}>
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap" data-aid={`p-geminiAnalysis-${idx}`}>{insight.geminiAnalysis}</p>
                                </div>
                            </div>
                            <figure className="mt-4" data-aid={`figure-insightImage-${idx}`}>
                                <img
                                    src={`pixabay-search://image?query=artificial+intelligence+data+insights+${(insight.objective || "AI").replace(/ /g, '+')}&pick_strategy=random&role=main`}
                                    alt={`Visual representing AI insights for ${insight.objective}`}
                                    className="w-full h-32 object-cover rounded-md"
                                    data-original-prompt={`artificial intelligence data insights ${insight.objective}`}
                                    data-aid={`img-pixabayInsight-${idx}-${campaignId.toString().substring(0,4)}`}
                                />
                                <figcaption className="text-xs text-gray-500 mt-1" data-aid={`figcaption-insightCaption-${idx}`}>Representação visual do insight de IA.</figcaption>
                            </figure>
                        </div>
                    ))}
                </div>
            </WidgetStatus>
        </div>
    );
}

// MODIFICATION 3: Create ScreenshotGalleryWidget Component
function ScreenshotGalleryWidget({ campaignId }) {
    const { data: missions, loading, error } = useAnalyticsData(`/analytics/campaign/${campaignId}/mission-results?type=BROWSER_SCREENSHOT`);

    return (
        <div data-aid="div-screenshotGalleryWidget-sGW0k1">
            <h3 className="text-lg font-semibold text-gray-300 mb-4" data-aid="h3-screenshotGalleryTitle-sGT2l3">Galeria de Screenshots de Navegador</h3>
            <WidgetStatus loading={loading} error={error} data={missions} dataType="screenshots de navegador">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" data-aid="div-screenshotsGrid-sG4m5">
                    {missions?.map((mission) => (
                        mission.result?.screenshot_base64 ? (
                            <figure key={mission.id} className="relative group overflow-hidden rounded-lg command-panel p-1 shadow-lg" data-aid={`fig-ss-${mission.id}`}>
                                <img
                                    src={`data:image/${mission.result.format || 'png'};base64,${mission.result.screenshot_base64}`}
                                    alt={`Screenshot de ${mission.result.source_url || 'URL desconhecida'}`}
                                    className="w-full h-auto object-contain rounded-md"
                                />
                                <figcaption className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs truncate" data-aid={`figcaption-ss-${mission.id}`}>
                                    {mission.result.source_url || 'URL não disponível'} (Missão: {mission.id})
                                </figcaption>
                            </figure>
                        ) : null
                    ))}
                </div>
            </WidgetStatus>
        </div>
    );
}

// MODIFICATION 4: Create HtmlViewerWidget Component
function HtmlViewerWidget({ campaignId }) {
    const { data: missions, loading, error } = useAnalyticsData(`/analytics/campaign/${campaignId}/mission-results?type=BROWSER_GET_HTML`);
    const [selectedMissionId, setSelectedMissionId] = useState(null);

    const selectedMission = useMemo(() => {
        if (!missions || !selectedMissionId) return null;
        return missions.find(m => m.id === parseInt(selectedMissionId));
    }, [missions, selectedMissionId]);

    return (
        <div data-aid="div-htmlViewerWidget-hVW0n2">
            <h3 className="text-lg font-semibold text-gray-300 mb-4" data-aid="h3-htmlViewerTitle-hVT1o3">Visualizador de HTML Capturado</h3>
            <WidgetStatus loading={loading} error={error} data={missions} dataType="HTML capturado">
                <div className="mb-4" data-aid="div-htmlSelectContainer-hSC2p4">
                    <label htmlFor="html-mission-select" className="block text-sm font-medium text-gray-400 mb-1" data-aid="label-htmlMissionSelect-hMS3q5">Selecione uma Missão para Visualizar HTML:</label>
                    <select
                        id="html-mission-select"
                        value={selectedMissionId || ''}
                        onChange={(e) => setSelectedMissionId(e.target.value)}
                        className="w-full p-2 text-sm rounded-md bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-amber-500 text-gray-200"
                        data-aid="select-htmlMission-sHM4r6"
                    >
                        <option value="" disabled data-aid="option-htmlDefault-oHD5s7">-- Escolha uma captura --</option>
                        {missions?.map(mission => (
                            <option key={mission.id} value={mission.id} data-aid={`option-htmlMission-${mission.id}`}>
                                {mission.result?.source_url || `Missão ${mission.id}`} - {new Date(mission.createdAt).toLocaleString()}
                            </option>
                        ))}
                    </select>
                </div>
                {selectedMission && selectedMission.result?.html_content && (
                    <div className="bg-gray-900 p-3 rounded-md border border-gray-700" data-aid="div-htmlContentContainer-hCC6t8">
                        <h4 className="text-md font-semibold text-amber-400 mb-2" data-aid="h4-htmlSourceUrl-hSU7u9">HTML de: {selectedMission.result.source_url}</h4>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-auto max-h-[60vh] bg-black/30 p-2 rounded" data-aid="pre-htmlContent-pHC8v0">
                            <code>
                                {selectedMission.result.html_content}
                            </code>
                        </pre>
                    </div>
                )}
            </WidgetStatus>
        </div>
    );
}


function PredictiveCortexView() {
    const { data: campaigns, loading, error } = useInitialData('/campaigns');
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [modelType, setModelType] = useState('sentiment_prediction');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const addToast = useToasts();

    useEffect(() => {
        if (campaigns && campaigns.length > 0 && !selectedCampaignId) {
            setSelectedCampaignId(campaigns[0].id);
        }
    }, [campaigns, selectedCampaignId]);

    const handleAnalysis = async () => {
        if (!selectedCampaignId) {
            addToast('Por favor, selecione uma campanha.', 'warning');
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const result = await apiService.postData('/cortex/analyze', { campaignId: selectedCampaignId, modelType });
            setAnalysisResult(result);
            addToast('Análise do Córtex concluída.', 'success');
        } catch(err) {
            addToast(err.message || 'Falha na análise preditiva.', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (loading) return <p className="text-center text-lg text-[var(--text-secondary)]" data-aid="p-loadingCortex-lC1r5"><i className="fas fa-spinner fa-spin mr-2" data-aid="i-cortexSpinner-cS2t6"></i>Carregando modelos preditivos...</p>;
    if (error) return <p className="text-red-400 text-center text-lg" data-aid="p-errorCortex-eC3u7">{error}</p>;
    if (!campaigns || campaigns.length === 0) return (
        <div className="command-panel rounded-lg p-8 flex items-center justify-center min-h-[400px] flex-col text-gray-500" data-aid="div-noCampaignsForCortex-nCFC1k2">
            <i className="fas fa-search-dollar text-5xl mb-4" data-aid="i-noCampaignsCortexIcon-iNCC2l3"></i>
            <p className="text-lg text-center" data-aid="p-noCampaignsCortexMessage-pNCC3m4">Nenhuma campanha estratégica foi definida para análise preditiva.</p>
        </div>
    );

    const chartOptions = {
        chart: { type: 'line', toolbar: { show: false } },
        colors: ['#2dd4bf', '#f59e0b'],
        stroke: { width: [3, 3], curve: 'smooth', dashArray: [0, 8] },
        xaxis: { type: 'datetime', labels: { style: { colors: 'var(--text-secondary)' } } },
        yaxis: { labels: { style: { colors: 'var(--text-secondary)' } } },
        tooltip: { theme: 'dark' },
        grid: { borderColor: 'rgba(55, 65, 81, 0.3)' },
        legend: { show: true, labels: { colors: 'var(--text-primary)'} },
        annotations: { xaxis: analysisResult?.prediction_start ? [{ x: new Date(analysisResult.prediction_start).getTime(), strokeDashArray: 2, borderColor: '#a78bfa', label: { borderColor: '#a78bfa', style: { color: '#fff', background: '#a78bfa' }, text: 'Início da Previsão' } }] : [] }
    };

    return (
        <div className="command-panel rounded-lg p-6 space-y-6" data-aid="div-cortexPanel-cP4v8">
            <header data-aid="header-cortex-hC5w9">
                <h2 className="text-2xl font-bold header-glow" data-aid="h2-cortexTitle-cT6x0"><i className="fas fa-brain mr-3" data-aid="i-cortexIconHeader-cIH7y1"></i>Córtex Preditivo</h2>
                <p className="text-[var(--text-secondary)] mt-1" data-aid="p-cortexSubtitle-cS8z2">Modele o futuro. Execute com precognição.</p>
            </header>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end" data-aid="section-cortexControls-sCC9a3">
                <div data-aid="div-campaignSelectContainer-cSC0b4">
                    <label htmlFor="cortex-campaign" className="block text-sm font-medium text-[var(--text-secondary)] mb-1" data-aid="label-campaign-cC1c5">Alvo da Análise (Campanha)</label>
                    <select id="cortex-campaign" value={selectedCampaignId} onChange={e => setSelectedCampaignId(e.target.value)} className="w-full p-2 text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] text-[var(--text-primary)] transition" data-aid="select-campaign-sC2d6">
                        {campaigns?.map(c => <option key={c.id} value={c.id} data-aid={`opt-campaign-${c.id}`}>{c.name}</option>)}
                    </select>
                </div>
                <div data-aid="div-modelSelectContainer-mSC3e7">
                    <Tooltip text="Selecione o modelo de IA para analisar os dados históricos e projetar tendências futuras.">
                      <label htmlFor="cortex-model" className="block text-sm font-medium text-[var(--text-secondary)] mb-1" data-aid="label-model-cM4f8">Modelo Preditivo <i className="fas fa-info-circle text-xs" data-aid="i-modelInfo-mI1e9"></i></label>
                    </Tooltip>
                    <select id="cortex-model" value={modelType} onChange={e => setModelType(e.target.value)} className="w-full p-2 text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] text-[var(--text-primary)] transition" data-aid="select-model-sM5g9">
                        <option value="sentiment_prediction" data-aid="opt-model-sentiment-sP1a1">Previsão de Sentimento</option>
                        <option value="market_trend_analysis" data-aid="opt-model-market-mT2b2">Análise de Tendência de Mercado</option>
                    </select>
                </div>
                <button onClick={handleAnalysis} disabled={isAnalyzing} className="w-full bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] text-white font-bold py-2 px-4 rounded-md transition-all shadow-lg hover:shadow-teal-500/50 disabled:bg-[var(--btn-disabled-bg)] disabled:cursor-wait" data-aid="btn-analyze-bA6h0">
                    {isAnalyzing ? <><i className="fas fa-spinner fa-spin mr-2" data-aid="i-analyzingSpinner-aS7i1"></i>Analisando...</> : <><i className="fas fa-cogs mr-2" data-aid="i-analyzeIcon-aI8j2"></i>Executar Análise</>}
                </button>
            </section>

            <section className="min-h-[450px] bg-gray-900/50 p-4 rounded-lg" data-aid="section-cortexResults-sCR1k3">
                 {!analysisResult && !isAnalyzing && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500" data-aid="div-cortexPlaceholder-cPH2l4">
                        <i className="fas fa-eye text-5xl mb-4" data-aid="i-cortexPlaceholderIcon-cPI3m5"></i>
                        <p className="text-lg" data-aid="p-cortexPlaceholderText-cPT4n6">Aguardando diretivas para iniciar a análise preditiva.</p>
                    </div>
                )}
                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center h-full text-teal-400" data-aid="div-cortexLoading-cLD5o7">
                        <i className="fas fa-atom fa-spin text-5xl mb-4" data-aid="i-cortexLoadingIcon-cLI6p8"></i>
                        <p className="text-lg" data-aid="p-cortexLoadingText-cLT7q9">Córtex Preditivo está processando futuros prováveis...</p>
                    </div>
                )}
                {analysisResult && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 fade-in" data-aid="div-cortexResultGrid-cRG8r0">
                        <div className="lg:col-span-3" data-aid="div-cortexChartContainer-cCC9s1">
                             {Chart && <Chart options={chartOptions} series={analysisResult.series} type="line" height="400" data-aid="chart-cortex-cC1j3" />}
                        </div>
                        <div className="lg:col-span-2 space-y-4" data-aid="div-cortexBriefingContainer-cBC0t2">
                            <h3 className="text-xl font-bold text-[var(--text-primary)]" data-aid="h3-briefingTitle-bT1u3"><i className="fas fa-file-alt mr-2 text-teal-400" data-aid="i-briefingIcon-bI2v4"></i>Briefing Estratégico</h3>
                            <div className="p-4 bg-black/40 rounded-md font-mono text-sm text-[var(--text-primary)] whitespace-pre-wrap h-96 overflow-y-auto" data-aid="div-briefingText-bT3w5">
                                {analysisResult.briefing}
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

function AgentRosterView() {
    const { data: agents, setData: setAgents, loading, error } = useInitialData('/agents');
    const [isImplantModalOpen, setIsImplantModalOpen] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [selectedAgentDetails, setSelectedAgentDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState(null);
    const { lastMessage } = useWebSocket();

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const agentsData = await apiService.fetchData('/agents');
                setAgents(agentsData || []);
                if (selectedAgentId) {
                    const updatedAgent = agentsData.find(a => a.id === selectedAgentId);
                    if (!updatedAgent) setSelectedAgentId(null);
                }
            } catch (err) {
                console.error("Erro ao buscar dados dos agentes:", err);
            }
        };
        fetchAgents();
        const intervalId = setInterval(fetchAgents, 10000);
        return () => clearInterval(intervalId);
    }, [selectedAgentId, lastMessage, setAgents]);

    useEffect(() => {
        if (!selectedAgentId) {
            setSelectedAgentDetails(null);
            return;
        }
        const fetchAgentDetail = async () => {
            setDetailsLoading(true);
            setDetailsError(null);
            try {
                const data = await apiService.fetchData(`/agents/${selectedAgentId}`);
                setSelectedAgentDetails(data);
            } catch (err) {
                setDetailsError('Falha ao carregar detalhes do agente.');
                console.error("Erro ao carregar detalhes do agente:", err);
            } finally {
                setDetailsLoading(false);
            }
        };
        fetchAgentDetail();
        const intervalId = setInterval(fetchAgentDetail, 5000);
        return () => clearInterval(intervalId);
    }, [selectedAgentId, lastMessage]);

    const renderCapabilityBadge = (key, value) => {
        let iconClass = 'fas fa-cogs';
        let displayValue = value;
        let colorClass = 'text-teal-400';

        switch (key) {
            case 'os':
                iconClass = value.toLowerCase().includes('windows') ? 'fab fa-windows' :
                            value.toLowerCase().includes('linux') ? 'fab fa-linux' :
                            value.toLowerCase().includes('darwin') || value.toLowerCase().includes('mac') ? 'fab fa-apple' : 'fas fa-desktop';
                displayValue = value;
                break;
            case 'arch': iconClass = 'fas fa-microchip'; break;
            case 'cpu_cores': iconClass = 'fas fa-microchip'; displayValue = `${value} Cores`; break;
            case 'ram_gb': iconClass = 'fas fa-memory'; displayValue = `${value} GB`; break;
            case 'gpu': iconClass = 'fas fa-grip-lines'; break;
            case 'cpuLoad':
                iconClass = 'fas fa-gauge-high';
                displayValue = `${(value * 100).toFixed(1)}% CPU`;
                if (value > 0.8) colorClass = 'text-red-400';
                else if (value > 0.5) colorClass = 'text-amber-400';
                break;
            case 'memoryUsage':
                iconClass = 'fas fa-memory';
                displayValue = `${(value * 100).toFixed(1)}% RAM`;
                if (value > 0.8) colorClass = 'text-red-400';
                else if (value > 0.6) colorClass = 'text-amber-400';
                break;
            case 'has_screen_access':
                iconClass = value ? 'fas fa-tv' : 'fas fa-ban';
                displayValue = value ? 'Acesso Tela' : 'Sem Tela';
                colorClass = value ? 'text-green-400' : 'text-gray-500';
                break;
            // MODIFICATION 2: Display browser control capability
            case 'has_browser_control':
                iconClass = value ? 'fas fa-window-maximize' : 'fas fa-window-close'; // Updated icon
                displayValue = value ? 'Ctrl. Navegador' : 'Sem Ctrl. Naveg.';
                colorClass = value ? 'text-blue-400' : 'text-gray-500';
                break;
            case 'browser_control_details':
                if (value && value.type) {
                    iconClass = 'fab fa-chrome'; // Assuming puppeteer/chrome for now
                    displayValue = `Via: ${value.type}`;
                } else {
                    return null; // Don't render if no details
                }
                break;
            default: iconClass = 'fas fa-info-circle'; break;
        }

        return (
            <div key={key} className={`inline-flex items-center text-sm font-mono bg-gray-800 text-gray-300 rounded-full px-3 py-1 mr-2 mb-2 border border-gray-700`} data-aid={`badge-cap-${key}-${selectedAgentId?.toString().substring(0,4)}`}>
                <i className={`${iconClass} mr-1 ${colorClass}`} data-aid={`icon-cap-${key}-${selectedAgentId?.toString().substring(0,4)}`}></i>
                <span data-aid={`text-cap-${key}-${selectedAgentId?.toString().substring(0,4)}`}>{displayValue}</span>
            </div>
        );
    };

    if (loading) return <p className="text-center text-lg text-[var(--text-secondary)]" data-aid="p-loadingAgents-lA1e2"><i className="fas fa-spinner fa-spin mr-2" data-aid="i-loadAgentsSpinner-las12"></i>Carregando roster de agentes...</p>;
    if (error) return <p className="text-red-400 text-center text-lg" data-aid="p-errorAgents-eA2f3"><i className="fas fa-broadcast-tower mr-2" data-aid="i-errAgentIcon-eai13"></i>{error}</p>;

    return (
        <main className="grid grid-cols-12 gap-6 lg:gap-8 h-full fade-in" data-aid="main-agentsView-gL8x1">
            <section className="col-span-12 lg:col-span-3 command-panel rounded-lg p-4 flex flex-col" data-aid="section-agentRoster-rS9p2">
                <div className="flex justify-between items-center border-b-2 border-gray-700 pb-2 mb-4" data-aid="div-rosterHeader-dG7a5">
                    <h2 className="text-xl font-bold text-gray-200" data-aid="h2-rosterTitle-hT8o3">
                        <i className="fas fa-satellite-dish mr-2 text-teal-400" data-aid="i-rosterIcon-iU7n4"></i>Roster
                    </h2>
                    <button onClick={() => setIsImplantModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold py-1 px-3 rounded-md transition" data-aid="btn-newImplant-bI4d8" title="Implantar Novo Agente">
                        <i className="fas fa-plus-circle" data-aid="i-plusAgentIcon-iH3e9"></i> Forja
                    </button>
                </div>
                <div id="agent-list" className="space-y-2 overflow-y-auto flex-grow max-h-[70vh]" data-aid="div-agentList-dI6m5">
                    {agents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500" data-aid="div-loader-aG5l6">
                            <i className="fas fa-spinner fa-spin text-3xl" data-aid="i-loaderIcon-iF4k7"></i>
                            <p className="mt-2" data-aid="p-loaderText-pF3j8">Contatando a Legião...</p>
                        </div>
                    ) : (
                        agents.map(agent => (
                            <div key={agent.id} onClick={() => setSelectedAgentId(agent.id)}
                                className={`list-item agent-list-item p-3 rounded-md flex items-center justify-between ${selectedAgentId === agent.id ? 'selected' : ''}`}
                                data-aid={`div-agentItem-${agent.agentId.substring(0,6)}`}>
                                <div data-aid={`div-agentInfo-${agent.agentId.substring(0,6)}`}>
                                    <p className="font-bold text-gray-200" data-aid={`p-agentHostname-${agent.hostname.replace(/\s/g, '-')}`}>{agent.hostname}</p>
                                    <p className="text-sm text-gray-400 font-mono" data-aid={`p-agentUuid-${agent.agentId.substring(0,6)}`}>{agent.agentId.substring(0, 8)}...</p>
                                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1" data-aid={`div-roster-caps-${agent.agentId.substring(0,6)}`}>
                                        {agent.capabilities && agent.capabilities.gpu && <i className="fas fa-grip-lines" title="GPU" data-aid={`icon-gpu-${agent.agentId.substring(0,4)}`}></i>}
                                        {agent.capabilities && agent.capabilities.cpu_cores && <i className="fas fa-microchip" title={`CPU: ${agent.capabilities.cpu_cores} Cores`} data-aid={`icon-cpu-${agent.agentId.substring(0,4)}`}></i>}
                                        {agent.capabilities && agent.capabilities.ram_gb && <i className="fas fa-memory" title={`RAM: ${agent.capabilities.ram_gb} GB`} data-aid={`icon-ram-${agent.agentId.substring(0,4)}`}></i>}
                                        {agent.capabilities && agent.capabilities.has_browser_control && <i className="fab fa-chrome text-blue-400" title="Controle de Navegador Ativo" data-aid={`icon-browser-${agent.agentId.substring(0,4)}`}></i>}
                                    </div>
                                </div>
                                <div className="text-right" data-aid={`div-agentStatus-${agent.agentId.substring(0,6)}`}>
                                    <span className={`status-dot status-${agent.status.toLowerCase()}`} data-aid={`span-statusDot-${agent.agentId.substring(0,6)}`}></span>
                                    <span className="ml-2 text-sm font-semibold" data-aid={`span-statusText-${agent.agentId.substring(0,6)}`}>{agent.status}</span>
                                    <p className="text-xs text-gray-500 mt-1" data-aid={`p-lastSeen-${agent.agentId.substring(0,6)}`}>{timeAgo(agent.lastSeen)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="col-span-12 lg:col-span-9 command-panel rounded-lg p-4" data-aid="section-agentDetails-sD2q9">
                <h2 className="text-xl font-bold text-gray-200 border-b-2 border-gray-700 pb-2 mb-4" data-aid="h2-detailsTitle-hC1p0">
                    <i className="fas fa-magnifying-glass-chart mr-2 text-teal-400" data-aid="i-detailsIcon-iB9o1"></i>Inteligência Tática
                </h2>
                <div id="agent-detail-view" data-aid="div-agentDetailView-dA8n2">
                    {!selectedAgentId ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 min-h-[400px]" data-aid="div-detailPlaceholder-pS7m3">
                            <i className="fas fa-user-secret text-5xl mb-4" data-aid="i-secretAgentIcon-iR6l4"></i>
                            <p className="text-lg text-center" data-aid="p-selectAgentPrompt-pR5k5">Selecione um Agente para inspecionar seus dados e execuções de missão.</p>
                        </div>
                    ) : detailsLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 min-h-[400px]" data-aid="div-detailsLoading-dL1m2">
                            <i className="fas fa-spinner fa-spin text-4xl mb-4" data-aid="i-detailsSpinner-iS2n3"></i>
                            <p className="text-lg text-center" data-aid="p-detailsLoadingText-pT3o4">Carregando detalhes do agente...</p>
                        </div>
                    ) : detailsError ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-400 min-h-[400px]" data-aid="div-detailsError-dE4p5">
                            <i className="fas fa-exclamation-triangle text-4xl mb-4" data-aid="i-detailsErrorIcon-iE5q6"></i>
                            <p className="text-lg text-center" data-aid="p-detailsErrorMessage-pE6r7">{detailsError}</p>
                        </div>
                    ) : (
                        <div id="agent-detail-content" className="space-y-6 fade-in" data-aid="div-detailContent-dO4j6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-aid={`div-detailGrid-${selectedAgentDetails.agentId.substring(0,6)}`}>
                                <div data-aid={`div-generalInfo-${selectedAgentDetails.agentId.substring(0,6)}`}>
                                    <h3 className="text-lg font-bold text-teal-300 mb-3" data-aid={`h3-generalInfo-${selectedAgentDetails.agentId.substring(0,6)}`}>Informações do Agente</h3>
                                    <div className="space-y-2 font-mono text-sm" data-aid={`div-infoList-${selectedAgentDetails.agentId.substring(0,6)}`}>
                                        <p data-aid={`p-detailHostname-${selectedAgentDetails.agentId.substring(0,6)}`}><strong className="text-gray-400">Hostname:</strong> {selectedAgentDetails.hostname}</p>
                                        <p data-aid={`p-detailId-${selectedAgentDetails.agentId.substring(0,6)}`}><strong className="text-gray-400">Agent ID:</strong> {selectedAgentDetails.agentId}</p>
                                        <p data-aid={`p-detailStatus-${selectedAgentDetails.agentId.substring(0,6)}`}><strong className="text-gray-400">Status:</strong> <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${selectedAgentDetails.status.toLowerCase() === 'idle' ? 'teal' : selectedAgentDetails.status.toLowerCase() === 'executing' ? 'yellow' : selectedAgentDetails.status.toLowerCase() === 'offline' ? 'gray' : 'red'}-500/20 text-${selectedAgentDetails.status.toLowerCase() === 'idle' ? 'teal' : selectedAgentDetails.status.toLowerCase() === 'executing' ? 'yellow' : selectedAgentDetails.status.toLowerCase() === 'offline' ? 'gray' : 'red'}-300`} data-aid={`span-statusBadge-${selectedAgentDetails.agentId.substring(0,6)}`}>{selectedAgentDetails.status}</span></p>
                                        <p data-aid={`p-detailLastSeen-${selectedAgentDetails.agentId.substring(0,6)}`}><strong className="text-gray-400">Último Contato:</strong> {new Date(selectedAgentDetails.lastSeen).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div data-aid={`div-metrics-${selectedAgentDetails.agentId.substring(0,6)}`}>
                                    <h3 className="text-lg font-bold text-teal-300 mb-3" data-aid={`h3-metrics-${selectedAgentDetails.agentId.substring(0,6)}`}>Métricas de Sistema</h3>
                                     <div className="flex flex-wrap gap-2" data-aid={`div-metricsList-${selectedAgentDetails.agentId.substring(0,6)}`}>
                                        {Object.entries(selectedAgentDetails.capabilities || {}).map(([key, value]) => renderCapabilityBadge(key, value))}
                                     </div>
                                </div>
                            </div>
                            <div className="mt-6" data-aid={`div-missionsHistory-${selectedAgentDetails.agentId.substring(0,6)}`}>
                                <h3 className="text-lg font-bold text-teal-300 mb-3" data-aid={`h3-missions-${selectedAgentDetails.agentId.substring(0,6)}`}>Histórico de Missões Recentes</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto" data-aid={`div-missionsList-${selectedAgentDetails.agentId.substring(0,6)}`}>
                                    {selectedAgentDetails.MissionExecutions && selectedAgentDetails.MissionExecutions.length > 0 ? selectedAgentDetails.MissionExecutions.map(m => (
                                        <div key={m.id} className="bg-gray-900 p-2 rounded-md text-sm border border-gray-700" data-aid={`div-missionItem-${m.id}`}>
                                            <p data-aid={`p-missionObj-${m.id}`}><strong className="text-gray-400">Objetivo:</strong> {m.manual_objective || m.MissionTemplate?.objective || `Missão Desconhecida (ID: ${m.id})`}</p>
                                            <p data-aid={`p-missionStatus-${m.id}`}><strong className="text-gray-400">Status:</strong> <span className={`capitalize text-${m.status.toLowerCase() === 'completed' ? 'green' : m.status.toLowerCase() === 'failed' ? 'red' : 'yellow'}-400`}>{m.status.replace('_', ' ').toLowerCase()}</span> <span className="text-gray-500" data-aid={`span-missionDate-${m.id}`}>- {new Date(m.createdAt).toLocaleDateString()}</span></p>
                                            {m.MissionTemplate?.templateType === 'AI_INSIGHTS' && m.result?.geminiAnalysis && (
                                                <div className="bg-gray-800 p-1 mt-2 text-xs rounded" data-aid={`div-geminiSummary-${m.id}`}>
                                                    <p className="text-teal-400 font-semibold">Gemini Summary:</p>
                                                    <p className="text-gray-400 line-clamp-2">{m.result.geminiAnalysis}</p>
                                                </div>
                                            )}
                                        </div>
                                    )).slice(0, 10) : <p className="text-gray-500" data-aid="p-noMissions-g5h3k">Nenhuma missão executada por este agente.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
            {isImplantModalOpen && <AgentImplantModal onClose={() => setIsImplantModalOpen(false)} data-aid="modal-agentImplant-mAI1b2" />}
        </main>
    );
}

function AgentImplantModal({ onClose }) {
    const [hostname, setHostname] = useState('');
    const [agentScript, setAgentScript] = useState('');
    const [feedback, setFeedback] = useState('');
    const addToast = useToasts();

    useEffect(() => {
        generateAndDisplayScript(hostname);
    }, [hostname]);

    const generateAndDisplayScript = useCallback((currentHostname) => {
        const HIVE_SERVER_BASE_URL = apiService.baseUrl.substring(0, apiService.baseUrl.lastIndexOf('/'));

        const scriptContent = `
// =======================================================
// Implante do Agente Nexus v1.0 - Auto-Gerado pela Colmeia
// =======================================================
// Diretivas:
// 1. Instale Node.js na máquina hospedeira.
// 2. Salve este script como 'nexus-agent.js'.
// 3. Execute usando 'node nexus-agent.js' ou use um gerenciador de processos como PM2.
// 4. **NOVO**: Para funcionalidades de controle de navegador, instale Puppeteer:
//    \`npm install puppeteer\` (ou \`puppeteer-core\` se usar Chrome/Chromium existente)
//    O agente detectará automaticamente se Puppeteer está disponível.
//
// Considerações de Produção para a Execução do Agente:
// Para um ambiente de produção escalável e resiliente, a lógica de execução de tarefas
// do agente (a função 'executeTask') deveria ser desacoplada do processo principal.
// Isso pode ser feito usando:
// - Workers (cluster module, worker_threads) para processamento em segundo plano.
// - Contêineres (Docker) para isolar cada execução de tarefa ou tipo de tarefa.
// - Sistemas de fila de mensagens (RabbitMQ, Kafka) para distribuir tarefas e garantir
//   que as mensagens sejam processadas mesmo se um agente falhar.
// Atualmente, a simulação ocorre no mesmo processo, o que pode bloquear o loop de eventos
// se as tarefas forem computacionalmente intensivas.

const os = require('os');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// MODIFICATION 1: Add Puppeteer Requirement and Setup
// NOVO: Requerimento para Controle de Navegador
// Para funcionalidades de controle de navegador, o 'puppeteer' deve estar instalado no ambiente do agente.
// Execute: npm install puppeteer
// Ou, para usar uma instalação existente do Chrome/Chromium: npm install puppeteer-core
let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (err) {
    log('Puppeteer não encontrado. Funcionalidades de controle de navegador estarão desabilitadas.');
    puppeteer = null; // Garante que puppeteer é definido, mesmo que como null.
}

let browserInstance = null; // Variável global para manter a instância do browser (opcional, pode ser gerenciada por função)

// Função para obter/lançar uma instância do browser
async function getBrowserInstance(context = {}) {
    // Por enquanto, não estamos usando o context para configurar o Puppeteer, mas poderia ser usado para proxy, user-agent etc.
    if (browserInstance && browserInstance.isConnected()) {
        log('Reutilizando instância existente do browser.');
        return browserInstance;
    }
    if (!puppeteer) {
        throw new Error('Puppeteer não está disponível.');
    }
    log('Lançando nova instância do browser com Puppeteer...');
    try {
        // Opções de lançamento para ambientes de servidor/CI (headless, no-sandbox)
        // Em um desktop normal, pode-se omitir args para ver o browser.
        browserInstance = await puppeteer.launch({
            headless: true, // 'new' para o novo modo headless, true para o antigo. 'new' é recomendado.
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Necessário em alguns ambientes Linux
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                // '--single-process', // Descontinuado em versões mais recentes do Chrome
                '--disable-gpu'
            ]
        });
        log('Instância do browser lançada com sucesso.');
        browserInstance.on('disconnected', () => {
            log('Instância do browser desconectada.');
            browserInstance = null;
        });
        return browserInstance;
    } catch (error) {
        log(\`Erro ao lançar browser com Puppeteer: \${error.message}\`);
        browserInstance = null; // Garante que não tentaremos usar uma instância falha
        throw error; // Re-lança o erro para ser pego pela executeTask
    }
}
// END MODIFICATION 1

// --- Configuração do Agente ---
const HIVE_URL = '${HIVE_SERVER_BASE_URL}';
const HEARTBEAT_INTERVAL = 15000;
const TASK_POLL_INTERVAL = 10000;
let AGENT_ID = null;
let AGENT_HOSTNAME = "${currentHostname || ''}" || os.hostname();
let CURRENT_STATUS = 'IDLE';

const log = (message) => console.log(\`[${new Date().toISOString()}] [Nexus Agent] \${message}\`);

function getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    const cpuLoad = os.loadavg().length > 0 ? os.loadavg()[0] / cpus.length : 0;

    return {
        os: os.platform(),
        arch: os.arch(),
        cpu_cores: cpus.length,
        cpuLoad: isNaN(cpuLoad) ? 0 : parseFloat(cpuLoad.toFixed(4)),
        ram_gb: parseFloat((totalMem / (1024 * 1024 * 1024)).toFixed(2)),
        memoryUsage: parseFloat((1 - (freeMem / totalMem)).toFixed(4)),
        gpu: "Detected GPU (Simulated)",
        has_screen_access: true,
        // MODIFICATION 2: Update getSystemMetrics for Browser Capability
        has_browser_control: !!puppeteer,
        browser_control_details: puppeteer ? { type: 'puppeteer' } : null
        // END MODIFICATION 2
    };
}

async function makeRequest(path, method = 'GET', data = null) {
    const fullUrl = new URL(HIVE_URL + path);
    const protocol = fullUrl.protocol === 'https:' ? https : http;

    const options = {
        hostname: fullUrl.hostname,
        port: fullUrl.port,
        path: fullUrl.pathname + fullUrl.search,
        method: method,
        headers: { 'Content-Type': 'application/json' },
    };

    return new Promise((resolve, reject) => {
        const req = protocol.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body ? JSON.parse(body) : {});
                } else if (res.statusCode === 204) {
                    resolve(null);
                } else {
                    const errorMsg = \`Request Failed. Status Code: \${res.statusCode}, Body: \${body}\`;
                    log(errorMsg);
                    reject(new Error(errorMsg));
                }
            });
        });

        req.on('error', (e) => {
            log(\`Erro na requisição: \${e.message}\`);
            reject(e);
        });
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

// MODIFICATION 3: Implement Browser Control Functions
async function navigateToUrl(browser, url, timeout = 60000) {
    let page = null;
    try {
        page = await browser.newPage();
        log(\`Navegando para URL: \${url}\`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout });
        log(\`Navegação para \${url} concluída.\`);
        return { success: true, url };
    } catch (error) {
        log(\`Erro ao navegar para \${url}: \${error.message}\`);
        throw error;
    } finally {
        if (page) await page.close();
    }
}

async function takePageScreenshot(browser, url, options = {}, timeout = 60000) {
    let page = null;
    try {
        page = await browser.newPage();
        log(\`Preparando para capturar screenshot de: \${url}\`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout });

        const ssOptions = {
            type: options.type || 'png',
            fullPage: options.fullPage === undefined ? false : options.fullPage,
            encoding: 'base64',
            ...(options.quality && options.type === 'jpeg' && { quality: parseInt(options.quality, 10) })
        };

        const imageBase64 = await page.screenshot(ssOptions);
        log(\`Screenshot de \${url} capturado com sucesso.\`);
        return { success: true, screenshot_base64: imageBase64, source_url: url, format: ssOptions.type };
    } catch (error) {
        log(\`Erro ao capturar screenshot de \${url}: \${error.message}\`);
        throw error;
    } finally {
        if (page) await page.close();
    }
}

async function getPageHtml(browser, url, timeout = 60000) {
    let page = null;
    try {
        page = await browser.newPage();
        log(\`Extraindo HTML de: \${url}\`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout });
        const htmlContent = await page.content();
        log(\`HTML de \${url} extraído com sucesso.\`);
        return { success: true, html_content: htmlContent, source_url: url };
    } catch (error) {
        log(\`Erro ao extrair HTML de \${url}: \${error.message}\`);
        throw error;
    } finally {
        if (page) await page.close();
    }
}
// END MODIFICATION 3

async function registerAgent() {
    log('Tentando registro na Colmeia...');
    try {
        const payload = {
            hostname: AGENT_HOSTNAME,
            capabilities: getSystemMetrics(),
        };
        const response = await makeRequest('/api/agents/register', 'POST', payload);
        AGENT_ID = response.agentId;
        log(\`Registro bem-sucedido. ID do Agente: \${AGENT_ID}\`);
        startCommunicationCycles();
    } catch (error) {
        log(\`Falha no registro: \${error.message}. Tentando novamente em 10s...\`);
        setTimeout(registerAgent, 10000);
    }
}

async function sendHeartbeat() {
    if (!AGENT_ID) return;
    try {
        const payload = {
            agentId: AGENT_ID,
            status: CURRENT_STATUS,
            capabilities: getSystemMetrics(),
        };
        await makeRequest('/api/agents/heartbeat', 'POST', payload);
    } catch (error) {
        log(\`Falha ao enviar heartbeat: \${error.message}\`);
    }
}

async function pollForTask() {
    if (!AGENT_ID || CURRENT_STATUS !== 'IDLE') return;
    try {
        const task = await makeRequest(\`/api/agents/\${AGENT_ID}/task\`);
        if (task) {
            log(\`Nova missão recebida: ID \${task.id}. Objetivo: \${task.manual_objective || task.objective}. Tipo: \${task.templateType}\`);
            executeTask(task); // This is now async due to MODIFICATION 4
        }
    } catch (error) {
        log(\`Erro ao buscar tarefa: \${error.message}\`);
    }
}

// MODIFICATION 4: Update executeTask Function
async function executeTask(task) {
    CURRENT_STATUS = 'EXECUTING';
    log(\`Executando missão \${task.id} (Tipo: \${task.templateType})...\`);
    const executionTimeStart = Date.now();

    let success = false;
    let missionSpecificResults = {};
    let resultPayload = { // Initialize resultPayload structure here
        status: 'FAILED', // Default to FAILED
        result: {
            message: 'Falha na execução: erro interno ou recurso indisponível.', // Default error message
            executionDurationMs: 0,
        }
    };


    try {
        switch (task.templateType) {
            case 'SENTIMENT_ANALYSIS':
                missionSpecificResults.sentiment = parseFloat((Math.random() * 2 - 1).toFixed(4));
                missionSpecificResults.rawData = \`Texto coletado para análise: Sentimento \${missionSpecificResults.sentiment}\`;
                break;
            case 'WEB_SCRAPE':
                missionSpecificResults.extractedData = [
                    { "item": "Alpha", "value": Math.random().toFixed(2) },
                    { "item": "Beta", "value": Math.random().toFixed(2) }
                ];
                missionSpecificResults.rawData = \`Dados brutos extraídos: \${JSON.stringify(missionSpecificResults.extractedData)}\`;
                break;
            case 'IMAGE_RECOGNITION':
                const imageUrls = [
                    "https://cdn.pixabay.com/photo/2021/08/04/13/06/ai-6521557_960_720.jpg",
                    "https://cdn.pixabay.com/photo/2016/11/29/05/45/ai-1867616_960_720.jpg",
                    "https://cdn.pixabay.com/photo/2019/06/17/08/38/artificial-intelligence-4284050_960_720.jpg"
                ];
                missionSpecificResults.imageAnalysis = {
                    sourceUrl: imageUrls[Math.floor(Math.random() * imageUrls.length)],
                    logoFound: ["Tech Corp", "Innovate Inc.", "Data-Synergy", "QuantumLeap", "Cyber Solutions"][Math.floor(Math.random()*5)],
                    confidence: parseFloat(Math.random().toFixed(2))
                };
                missionSpecificResults.rawData = \`Descrição da imagem: \${JSON.stringify(missionSpecificResults.imageAnalysis)}\`;
                break;
            case 'API_MONITORING':
                missionSpecificResults.apiResponse = {
                    status: Math.random() > 0.9 ? 500 : 200,
                    time: Math.floor(Math.random() * 500) + 50
                };
                missionSpecificResults.rawData = \`Monitoramento de API: \${JSON.stringify(missionSpecificResults.apiResponse)}\`;
                break;
            case 'DATA_PROCESSING':
                missionSpecificResults.processedRecords = Math.floor(Math.random() * 1000) + 100;
                missionSpecificResults.rawData = \`Dados processados: \${missionSpecificResults.processedRecords} registros.\`;
                break;
            case 'AI_INSIGHTS':
                missionSpecificResults.rawData = \`Relatório financeiro mensal de uma corporação fictícia:
Receita total: \$1,234,567
Despesas operacionais: \$876,543
Lucro líquido: \$358,024
Comentários: Houve um aumento de 15% nas vendas de produtos de software, mas o custo de aquisição de clientes aumentou 10%. A equipe de P&D lançou 2 novos protótipos de IA.
Dados de clientes: 50.000 novos clientes no último trimestre, taxa de churn de 2%.
Tendências de mercado: Crescimento acelerado em IA e Machine Learning, desaceleração no setor de hardware tradicional.
Principais Riscos: Concorrência acirrada e flutuações cambiais.
Oportunidades: Expansão para mercados emergentes e parcerias estratégicas em nuvem.\`;
                missionSpecificResults.aiObjective = task.objective;
                break;
            case 'BROWSER_NAVIGATE':
                if (!puppeteer) throw new Error('Puppeteer não disponível para BROWSER_NAVIGATE.');
                const browserNav = await getBrowserInstance(task.context);
                missionSpecificResults = await navigateToUrl(browserNav, task.context.url, task.context.timeout);
                break;
            case 'BROWSER_SCREENSHOT':
                if (!puppeteer) throw new Error('Puppeteer não disponível para BROWSER_SCREENSHOT.');
                const browserSs = await getBrowserInstance(task.context);
                missionSpecificResults = await takePageScreenshot(browserSs, task.context.url, task.context.screenshotOptions, task.context.timeout);
                break;
            case 'BROWSER_GET_HTML':
                if (!puppeteer) throw new Error('Puppeteer não disponível para BROWSER_GET_HTML.');
                const browserHtml = await getBrowserInstance(task.context);
                missionSpecificResults = await getPageHtml(browserHtml, task.context.url, task.context.timeout);
                break;
            default:
                missionSpecificResults.genericOutput = \`Missão tipo '\${task.templateType}' concluída com sucesso.\`;
                missionSpecificResults.rawData = \`Saída genérica: \${missionSpecificResults.genericOutput}\`;
        }
        success = missionSpecificResults.success !== undefined ? missionSpecificResults.success : true;
        resultPayload.result = { ...resultPayload.result, ...missionSpecificResults };

    } catch (err) {
        log(\`Erro durante execução da missão \${task.id}: \${err.message}\`);
        resultPayload.result.errorMessage = err.message;
        success = false; // Explicitly set success to false on error
    }

    const executionDurationMs = Date.now() - executionTimeStart;
    resultPayload.status = success ? 'COMPLETED' : 'FAILED';
    // Ensure message is set based on success/failure
    resultPayload.result.message = success ? (resultPayload.result.message || 'Objetivo alcançado com sucesso.') : (resultPayload.result.errorMessage || 'Falha na execução: erro interno ou recurso indisponível.');
    resultPayload.result.executionDurationMs = parseFloat(executionDurationMs.toFixed(0));

    log(\`Missão \${task.id} finalizada com status: \${resultPayload.status}\`);
    await updateTask(task.id, resultPayload);
    CURRENT_STATUS = 'IDLE';
}
// END MODIFICATION 4

async function updateTask(taskId, resultPayload) {
    try {
        await makeRequest(\`/api/missions/\${taskId}/update\`, 'POST', resultPayload);
        log(\`Resultado da missão \${taskId} enviado para a Colmeia.\`);
    } catch (error) {
        log(\`Falha ao atualizar missão \${taskId}: \${error.message}\`);
    }
}

let heartbeatIntervalId;
let taskPollIntervalId;

function startCommunicationCycles() {
    if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
    if (taskPollIntervalId) clearInterval(taskPollIntervalId);

    heartbeatIntervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    taskPollIntervalId = setInterval(pollForTask, TASK_POLL_INTERVAL);
    log('Ciclos de heartbeat e polling de tarefas iniciados.');
}

async function main() {
    log('Implante Nexus v1.0 ativado. Iniciando protocolos...');
    await registerAgent();
}

main();
        `.trim();
        setAgentScript(scriptContent);
    }, [apiService.baseUrl]);

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(agentScript);
            addToast('Script copiado para a área de transferência!', 'success');
            setFeedback('Copiado!');
            setTimeout(() => setFeedback(''), 2000);
        } catch (err) {
            addToast('Falha ao copiar script.', 'error');
            setFeedback('Falha ao copiar.');
            console.error('Falha ao copiar código:', err);
        }
    };

    const handleDownloadScript = () => {
        const blob = new Blob([agentScript], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${hostname || 'nexus-agent'}.js`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 fade-in" data-aid="div-modalAgentImplant-dM5t2">
            <div className="command-panel rounded-lg p-8 w-full max-w-3xl space-y-4 max-h-[90vh] flex flex-col" data-aid="div-modalImplantContent-dK3u3">
                <h3 className="text-2xl font-bold text-teal-400" data-aid="h3-newImplantTitle-hJ2v4">Forja de Agentes: Preparar Implante</h3>
                <p className="text-[var(--text-secondary)]" data-aid="p-implantDesc-pI1w5">Gere e baixe um pacote de software auto-suficiente do Agente Nexus. Este script Node.js, quando executado em uma máquina hospedeira, se registrará na Colmeia e aguardará ordens.</p>

                <div className="flex-grow overflow-y-auto pr-4" data-aid="div-implantScroll-dG9x6">
                    <div data-aid="div-implantConfig-dH8y7">
                        <label htmlFor="agent-hostname" className="block text-md font-medium text-[var(--text-primary)] mb-1" data-aid="label-agentHostname-lF7z8">Nome do Host (Opcional)</label>
                        <input
                            type="text"
                            id="agent-hostname"
                            className="w-full p-2 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] text-[var(--text-primary)]"
                            placeholder="Ex: dev-machine-01"
                            value={hostname}
                            onChange={(e) => setHostname(e.target.value)}
                            required
                            data-aid="input-agentHostname-iE6a9"
                        />
                        <p className="text-xs text-gray-500 mt-1" data-aid="p-hostnameHelp-pD5b0">Se deixado em branco, o agente usará o nome do host do sistema operacional.</p>
                    </div>

                    <div className="mt-6" data-aid="div-implantCodeSection-dC4c1">
                         <div className="code-block rounded-lg overflow-hidden" data-aid="div-codeContainer-dB3d2">
                            <div className="code-block-header p-3 flex justify-between items-center" data-aid="div-codeHeader-dA2e3">
                                <span className="font-mono text-sm text-[var(--text-primary)]" data-aid="span-codeFilename-sZ1f4"><i className="fab fa-node-js mr-2 text-green-400" data-aid="i-nodeIcon-iY9g5"></i>nexus-agent.js</span>
                                <button onClick={handleCopyCode} className="text-gray-400 hover:text-white transition relative" title="Copiar Código" data-aid="btn-copyCode-bX8h6">
                                    <i className="fas fa-copy" data-aid="i-copyIcon-iW7i7"></i>
                                    {feedback && <span id="copy-feedback" className="text-xs absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-700 text-white px-2 py-1 rounded-md transition-all duration-300" data-aid="span-copyFeedback-sV6j8">{feedback}</span>}
                                </button>
                            </div>
                            <pre className="p-4 text-xs overflow-x-auto text-[var(--text-primary)]" data-aid="pre-codeBlock-pU5k9">
                                <code id="agent-code-block" className="font-mono" data-aid="code-agentScript-cU4j0">{agentScript}</code>
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700" data-aid="div-implantFormActions-dP8o3">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-bold py-2 px-4 rounded-md transition" data-aid="btn-cancelImplant-bO7p4">Fechar</button>
                    <button type="button" onClick={handleDownloadScript} className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50" disabled={!agentScript} data-aid="btn-downloadImplant-bN6q5"><i className="fas fa-download mr-2" data-aid="i-downloadIcon-iM5r6"></i>Baixar Script</button>
                </div>
            </div>
        </div>
    );
}

function CampaignManagementView() {
    const { data: campaigns, setData: setCampaigns, loading: campaignsLoading, error: campaignsError } = useInitialData('/campaigns');
    const { data: agents, setData: setAgents, loading: agentsLoading, error: agentsError } = useInitialData('/agents');

    const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
    const [selectedCampaignId, setSelectedCampaignId] = useState(null);
    const [selectedCampaignDetails, setSelectedCampaignDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState(null);
    const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);

    const [dispatchAgentId, setDispatchAgentId] = useState('');
    const [dispatchObjective, setDispatchObjective] = useState('');
    const [dispatchContext, setDispatchContext] = useState('{}');
    const [dispatchLoading, setDispatchLoading] = useState(false);
    const [dispatchFeedback, setDispatchFeedback] = useState('');
    const addToast = useToasts();
    const { lastMessage } = useWebSocket();

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const campaignsData = await apiService.fetchData('/campaigns');
                setCampaigns(campaignsData || []);
                const agentsData = await apiService.fetchData('/agents');
                setAgents(agentsData || []);

                if (campaignsData && campaignsData.length > 0 &&
                    (!selectedCampaignId || !campaignsData.some(c => c.id === selectedCampaignId))) {
                    setSelectedCampaignId(campaignsData[0].id);
                } else if (campaignsData && campaignsData.length === 0) {
                    setSelectedCampaignId(null);
                }
            } catch (err) {
                console.error("Erro ao buscar dados do dashboard (Campanhas/Agentes):", err);
            }
        };

        fetchAllData();
        const intervalId = setInterval(fetchAllData, 10000);
        return () => clearInterval(intervalId);
    }, [selectedCampaignId, lastMessage, setCampaigns, setAgents]);

    useEffect(() => {
        if (!selectedCampaignId) {
            setSelectedCampaignDetails(null);
            return;
        }
        const fetchCampaignDetail = async () => {
            setDetailsLoading(true);
            setDetailsError(null);
            try {
                const data = await apiService.fetchData(`/campaigns/${selectedCampaignId}`);
                setSelectedCampaignDetails(data);
            } catch (err) {
                setDetailsError('Falha ao carregar detalhes da campanha.');
                console.error("Erro ao carregar detalhes da campanha:", err);
            } finally {
                setDetailsLoading(false);
            }
        };
        fetchCampaignDetail();
        const intervalId = setInterval(fetchCampaignDetail, 10000);
        return () => clearInterval(intervalId);
    }, [selectedCampaignId]);


    const handleCreateNewCampaign = async (campaignData) => {
        try {
            await apiService.postData('/campaigns', campaignData);
            addToast('Campanha criada com sucesso!', 'success');
            setIsNewCampaignModalOpen(false);
        } catch (error) {
            addToast(`Erro ao criar campanha: ${error.message}`, 'error');
            console.error("Erro ao criar campanha:", error);
        }
    };

    const handleCreateNewTemplate = async (templateData) => {
        try {
            await apiService.postData(`/campaigns/${selectedCampaignId}/templates`, templateData);
            addToast('Modelo de missão criado com sucesso!', 'success');
            setIsNewTemplateModalOpen(false);
            if (selectedCampaignId) {
                const updatedDetails = await apiService.fetchData(`/campaigns/${selectedCampaignId}`);
                setSelectedCampaignDetails(updatedDetails);
            }
        } catch (error) {
            addToast(`Erro ao criar modelo de missão: ${error.message}`, 'error');
            console.error("Erro ao criar modelo de missão:", error);
        }
    };

    const handleUpdateCampaignStatus = async (newStatus) => {
        if (!selectedCampaignId) return;
        setDispatchLoading(true);
        setDispatchFeedback('');
        try {
            await apiService.putData(`/campaigns/${selectedCampaignId}/status`, { status: newStatus });
            addToast(`Status da campanha atualizado para ${newStatus}.`, 'success');
            setSelectedCampaignDetails(prev => ({ ...prev, status: newStatus }));
        } catch (error) {
            addToast(`Erro ao atualizar status: ${error.message}`, 'error');
            console.error("Erro ao atualizar status da campanha:", error);
        } finally {
            setDispatchLoading(false);
            setTimeout(() => setDispatchFeedback(''), 3000);
        }
    };

    const handleDispatchMission = async (e) => {
        e.preventDefault();
        setDispatchLoading(true);
        setDispatchFeedback('');
        try {
            const contextParsed = JSON.parse(dispatchContext);
            await apiService.postData('/dispatch/goal', {
                targetAgentId: dispatchAgentId,
                objective: dispatchObjective,
                context: contextParsed,
            });
            addToast('Missão despachada com sucesso!', 'success');
            setDispatchFeedback('Missão despachada com sucesso!');
            setDispatchAgentId('');
            setDispatchObjective('');
            setDispatchContext('{}');
        } catch (error) {
            addToast(`Erro ao despachar: ${error.message}`, 'error');
            setDispatchFeedback(`Erro ao despachar: ${error.message}`);
            console.error("Erro ao despachar missão:", error);
        } finally {
            setDispatchLoading(false);
            setTimeout(() => setDispatchFeedback(''), 3000);
        }
    };

    if (campaignsLoading || agentsLoading) return <p className="text-center text-lg text-[var(--text-secondary)]" data-aid="p-loadingCampaignsManagement-lCM1e2"><i className="fas fa-spinner fa-spin mr-2" data-aid="i-loadCMMSpinner-lcms12"></i>Carregando gerenciamento de campanhas...</p>;
    if (campaignsError || agentsError) return <p className="text-red-400 text-center text-lg" data-aid="p-errorCampaignsManagement-eCM2f3"><i className="fas fa-broadcast-tower mr-2" data-aid="i-errCMIcon-ecmi13"></i>{campaignsError || agentsError}</p>;

    return (
        <main id="view-campaigns" className="grid grid-cols-12 gap-6 lg:gap-8 h-full fade-in" data-aid="main-campaignsView-mN9y2">
            <section className="col-span-12 lg:col-span-3 command-panel rounded-lg p-4 flex flex-col" data-aid="section-campaignList-sM8z3">
                <div className="flex justify-between items-center border-b-2 border-gray-700 pb-2 mb-4" data-aid="div-campaignHeader-dL7a4">
                    <h2 className="text-xl font-bold text-gray-200" data-aid="h2-campaignsTitle-hK6b5">
                        <i className="fas fa-bullseye mr-2 text-violet-400" data-aid="i-campaignsIcon-iJ5c6"></i>Campanhas
                    </h2>
                    <button onClick={() => setIsNewCampaignModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold py-1 px-3 rounded-md transition" data-aid="btn-newCampaign-bI4d7">
                        <i className="fas fa-plus" data-aid="i-plusIcon-iH3e8"></i> Nova
                    </button>
                </div>
                <div id="campaign-list" className="space-y-2 overflow-y-auto flex-grow max-h-[70vh]" data-aid="div-campaignListContainer-dG2f9">
                    {campaigns.length === 0 ? (
                        <div className="text-center py-8 text-gray-500" data-aid="div-campaignLoader-dF1g0">
                            <i className="fas fa-spinner fa-spin text-3xl" data-aid="i-campaignSpinner-iE9h1"></i>
                            <p className="mt-2" data-aid="p-campaignLoaderText-pD8i2">Carregando Planos Estratégicos...</p>
                        </div>
                    ) : (
                        campaigns.map(campaign => (
                            <div key={campaign.id} onClick={() => setSelectedCampaignId(campaign.id)}
                                className={`list-item campaign-list-item p-3 rounded-md ${selectedCampaignId === campaign.id ? 'selected' : ''}`}
                                data-aid={`div-campaignItem-${campaign.id}`}>
                                <p className="font-bold text-[var(--text-primary)]" data-aid={`p-campaignName-${campaign.id}`}>{campaign.name}</p>
                                <p className="text-sm capitalize text-[var(--text-secondary)]" data-aid={`p-campaignStatus-${campaign.id}`}>{campaign.status.toLowerCase()}</p>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="col-span-12 lg:col-span-9 command-panel rounded-lg p-4" data-aid="section-campaignDetails-sC7j3">
                <h2 className="text-xl font-bold text-gray-200 border-b-2 border-gray-700 pb-2 mb-4" data-aid="h2-campaignDetailsTitle-hB6k4">
                    <i className="fas fa-clipboard-list mr-2 text-violet-400" data-aid="i-campaignDetailsIcon-iA5l5"></i>Inteligência Estratégica
                </h2>
                <div id="campaign-detail-view" data-aid="div-campaignDetailView-dA4m6">
                    {!selectedCampaignId ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 min-h-[400px]" data-aid="div-campaignPlaceholder-dB3n7">
                            <i className="fas fa-lightbulb text-5xl mb-4" data-aid="i-lightbulbIcon-iZ2o8"></i>
                            <p className="text-lg text-center" data-aid="p-selectCampaignPrompt-pY1p9">Selecione uma Campanha para inspecionar seus objetivos e modelos de missão.</p>
                        </div>
                    ) : detailsLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 min-h-[400px]" data-aid="div-campaignDetailsLoading-dCL1m2">
                            <i className="fas fa-spinner fa-spin text-4xl mb-4" data-aid="i-campaignDetailsSpinner-iCS2n3"></i>
                            <p className="text-lg text-center" data-aid="p-campaignDetailsLoadingText-pCL3o4">Carregando detalhes da campanha...</p>
                        </div>
                    ) : detailsError ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-400 min-h-[400px]" data-aid="div-campaignDetailsError-dCE4p5">
                            <i className="fas fa-exclamation-triangle text-4xl mb-4" data-aid="i-campaignDetailsErrorIcon-iCE5q6"></i>
                            <p className="text-lg text-center" data-aid="p-campaignDetailsErrorMessage-pCE6r7">{detailsError}</p>
                        </div>
                    ) : (
                        <div id="campaign-detail-content" className="space-y-6 fade-in" data-aid="div-campaignContent-dX9q0">
                            <div>
                                <h3 className="text-lg font-bold text-violet-300 mb-2" data-aid="h3-campaignInfoTitle-hCI1j2">Informações da Campanha</h3>
                                <p className="text-[var(--text-primary)]" data-aid="p-campaignDetailName-pCDN3k4"><strong className="text-gray-400">Nome:</strong> {selectedCampaignDetails.name}</p>
                                <p className="text-[var(--text-primary)]" data-aid="p-campaignDetailObj-pCDO5l6"><strong className="text-gray-400">Objetivo:</strong> {selectedCampaignDetails.objective}</p>
                                <p className="text-[var(--text-primary)]" data-aid="p-campaignDetailStatus-pCDS7m8"><strong className="text-gray-400">Status:</strong> <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${selectedCampaignDetails.status.toLowerCase() === 'active' ? 'violet' : 'gray'}-500/20 text-${selectedCampaignDetails.status.toLowerCase() === 'active' ? 'violet' : 'gray'}-300`} data-aid={`span-campaignStatusBadge-${selectedCampaignDetails.id}`}>{selectedCampaignDetails.status}</span></p>
                                <div className="mt-3 flex space-x-2" data-aid="div-campaignStatusActions-dCSA1o2">
                                    <button onClick={() => handleUpdateCampaignStatus('ACTIVE')} disabled={selectedCampaignDetails.status === 'ACTIVE' || dispatchLoading} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-md transition disabled:bg-gray-600 disabled:cursor-not-allowed" data-aid="btn-setStatusActive-bSSA3p4"><i className="fas fa-play mr-1"></i>Ativar</button>
                                    <button onClick={() => handleUpdateCampaignStatus('PAUSED')} disabled={selectedCampaignDetails.status === 'PAUSED' || dispatchLoading} className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1 rounded-md transition disabled:bg-gray-600 disabled:cursor-not-allowed" data-aid="btn-setStatusPaused-bSSP5q6"><i className="fas fa-pause mr-1"></i>Pausar</button>
                                    <button onClick={() => handleUpdateCampaignStatus('COMPLETED')} disabled={selectedCampaignDetails.status === 'COMPLETED' || dispatchLoading} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-md transition disabled:bg-gray-600 disabled:cursor-not-allowed" data-aid="btn-setStatusCompleted-bSSC7r8"><i className="fas fa-check-double mr-1"></i>Concluir</button>
                                </div>
                            </div>
                            <div className="mt-6" data-aid="div-missionTemplatesSection-dMT1n2">
                                <div className="flex justify-between items-center mb-3" data-aid="div-templatesHeader-dH2o3">
                                    <h3 className="text-lg font-bold text-violet-300" data-aid="h3-missionTemplatesTitle-hMT4p5">Modelos de Missão</h3>
                                    <button onClick={() => setIsNewTemplateModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-1 px-3 rounded-md transition" data-aid="btn-newTemplate-bNT6q7">
                                        <i className="fas fa-plus" data-aid="i-plusTemplateIcon-iPT8r9"></i> Novo Template
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-700 rounded-md p-2" data-aid="div-templatesList-dTL1s2">
                                    {selectedCampaignDetails.MissionTemplates && selectedCampaignDetails.MissionTemplates.length > 0 ? (
                                        selectedCampaignDetails.MissionTemplates.map(template => (
                                            <div key={template.id} className="bg-gray-900 p-3 rounded-md border border-gray-800 hover:border-violet-500 transition-all" data-aid={`div-missionTemplateItem-${template.id}`}>
                                                <p className="font-bold text-[var(--text-primary)]" data-aid={`p-templateObj-${template.id}`}>{template.objective}</p>
                                                <p className="text-sm text-[var(--text-secondary)] font-mono" data-aid={`p-templateType-${template.id}`}>Tipo: <span className="text-teal-300">{template.templateType.replace(/_/g, ' ').toLowerCase()}</span></p>
                                                {template.context && (
                                                    <Fragment>
                                                        <p className="text-xs text-gray-500 mt-1" data-aid={`p-templateContextLabel-${template.id}`}>Contexto:</p>
                                                        <pre className="text-xs text-gray-500 bg-black/20 p-1 rounded font-mono overflow-x-auto max-h-20" data-aid={`pre-templateContext-${template.id}`}>{JSON.stringify(template.context, null, 2)}</pre>
                                                    </Fragment>
                                                )}
                                                {template.requiredCapabilities && Object.keys(template.requiredCapabilities).length > 0 && (
                                                     <Fragment>
                                                        <p className="text-xs text-gray-500 mt-1" data-aid={`p-templateCapsLabel-${template.id}`}>Capacidades Requeridas:</p>
                                                        <pre className="text-xs text-gray-500 bg-black/20 p-1 rounded font-mono overflow-x-auto max-h-20" data-aid={`pre-templateCaps-${template.id}`}>{JSON.stringify(template.requiredCapabilities, null, 2)}</pre>
                                                     </Fragment>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-center py-4" data-aid="p-noTemplates-nTP3t4">Nenhum modelo de missão definido para esta campanha.</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6" data-aid="div-dispatchConsole-dDC1u2">
                                <h3 className="text-lg font-bold text-violet-300 mb-3" data-aid="h3-dispatchTitle-hDT3v4">Console de Despacho Rápido</h3>
                                <form onSubmit={handleDispatchMission} className="space-y-4" data-aid="form-dispatch-fD4w5">
                                    <div>
                                        <label htmlFor="dispatch-target-agent" className="block text-md font-medium text-[var(--text-primary)] mb-1" data-aid="label-dispatchAgent-lDA6x7">Alvo da Missão:</label>
                                        <select
                                            id="dispatch-target-agent"
                                            className="w-full p-2 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] text-[var(--text-primary)]"
                                            value={dispatchAgentId}
                                            onChange={(e) => setDispatchAgentId(e.target.value)}
                                            required
                                            disabled={dispatchLoading}
                                            data-aid="select-dispatchTargetAgent-sDTA8y9"
                                        >
                                            <option value="" disabled data-aid="option-selectDefault-oSD1z2">Selecione um agente...</option>
                                            {Array.isArray(agents) && agents.map(agent => (
                                                <option key={agent.agentId} value={agent.agentId} data-aid={`option-agent-${agent.agentId.substring(0,4)}`}>
                                                    {agent.hostname} ({agent.agentId.substring(0,8)}...) - {agent.status}
                                                </option>
                                            ))}
                                        </select>
                                        {agents.length === 0 && <p className="text-xs text-red-400 mt-1" data-aid="p-noAgentsAvailable-pNAA3q4">Nenhum agente disponível. Crie um na aba "Agentes".</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="dispatch-mission-objective" className="block text-md font-medium text-[var(--text-primary)] mb-1" data-aid="label-dispatchObjective-lDMO2a3">Objetivo:</label>
                                        <input
                                            type="text"
                                            id="dispatch-mission-objective"
                                            className="w-full p-2 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] text-[var(--text-primary)]"
                                            placeholder="Ex: Rastrear menções no Twitter"
                                            value={dispatchObjective}
                                            onChange={(e) => setDispatchObjective(e.target.value)}
                                            required
                                            disabled={dispatchLoading}
                                            data-aid="input-dispatchObjective-iDMO4b5"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dispatch-mission-context" className="block text-md font-medium text-[var(--text-primary)] mb-1" data-aid="label-dispatchContext-lDMC6c7">Contexto (JSON):</label>
                                        <textarea
                                            id="dispatch-mission-context"
                                            rows="4"
                                            className="w-full p-2 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] text-[var(--text-primary)]"
                                            placeholder='{ "query": "AI Ethics", "platform": "Twitter" }'
                                            value={dispatchContext}
                                            onChange={(e) => setDispatchContext(e.target.value)}
                                            required
                                            disabled={dispatchLoading}
                                            data-aid="textarea-dispatchContext-tDMC8d9"
                                        ></textarea>
                                        <p className="text-xs text-gray-500 mt-1" data-aid="p-dispatchContextHelp-pDCH0e1">Garanta que o contexto seja um JSON válido.</p>
                                    </div>
                                    {dispatchFeedback && (
                                        <p className={`text-sm ${dispatchFeedback.startsWith('Erro') ? 'text-red-400' : 'text-teal-400'}`} data-aid="p-dispatchFeedback-pDF1e2">{dispatchFeedback}</p>
                                    )}
                                    <div className="pt-4" data-aid="div-dispatchButtonContainer-dG3zD">
                                        <button type="submit" id="dispatch-button"
                                            className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-violet-500/75 disabled:bg-gray-600 disabled:cursor-not-allowed"
                                            disabled={dispatchLoading || agents.length === 0}
                                            data-aid="btn-dispatch-bF2yE">
                                             <span className="btn-text" data-aid="span-dispatchText-sE1xE"><i className="fas fa-rocket mr-2" data-aid="i-rocketIcon-iD9wF"></i>Despachar Missão</span>
                                             {dispatchLoading && <span className="btn-spinner ml-2" data-aid="span-dispatchSpinner-sC8vG"><i className="fas fa-spinner fa-spin" data-aid="i-spinner-iB7uH"></i></span>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </section>
            {isNewCampaignModalOpen && <NewCampaignModal onClose={() => setIsNewCampaignModalOpen(false)} onCreate={handleCreateNewCampaign} data-aid="modal-newCampaign-mNC1f2" />}
            {isNewTemplateModalOpen && selectedCampaignDetails && (
                <NewMissionTemplateModal
                    onClose={() => setIsNewTemplateModalOpen(false)}
                    campaignId={selectedCampaignDetails.id}
                    onCreate={handleCreateNewTemplate}
                    data-aid="modal-newTemplate-mNT1g2"
                />
            )}
        </main>
    );
}

function NewCampaignModal({ onClose, onCreate }) {
    const [name, setName] = useState('');
    const [objective, setObjective] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await onCreate({ name, objective });
        } catch (err) {
            setError(err.message || 'Falha ao criar campanha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 fade-in" data-aid="div-modalNewCampaign-dM5t1">
             <div className="command-panel rounded-lg p-8 w-full max-w-lg space-y-4" data-aid="div-modalCampaignContent-dK3u2">
                <h3 className="text-2xl font-bold text-violet-400" data-aid="h3-newCampaignTitle-hJ2v3">Definir Nova Campanha</h3>
                <form onSubmit={handleSubmit} className="space-y-4" data-aid="form-newCampaign-fI1w4">
                    <div>
                        <label htmlFor="campaign-name" className="block text-md font-medium text-[var(--text-primary)] mb-1" data-aid="label-campaignName-lH9x5">Nome da Campanha</label>
                        <input
                            type="text"
                            id="campaign-name"
                            className="w-full p-2 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-violet-500 text-[var(--text-primary)]"
                            placeholder="Ex: Monitoramento de Concorrentes"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={loading}
                            data-aid="input-campaignName-iG8y6"
                        />
                    </div>
                    <div>
                        <label htmlFor="campaign-objective" className="block text-md font-medium text-[var(--text-primary)] mb-1" data-aid="label-campaignObjective-lF7z7">Objetivo Estratégico</label>
                        <textarea
                            id="campaign-objective"
                            rows="3"
                            className="w-full p-2 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-violet-500 text-[var(--text-primary)]"
                            placeholder="Ex: Rastrear menções e análises de produtos concorrentes."
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            required
                            disabled={loading}
                            data-aid="textarea-campaignObjective-tE6a8"
                        ></textarea>
                    </div>
                    {error && <p className="text-red-400 text-sm" data-aid="p-campaignError-pCE1f2">{error}</p>}
                    <div className="flex justify-end space-x-4 pt-4" data-aid="div-campaignFormActions-dD5b9">
                        <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-bold py-2 px-4 rounded-md transition" data-aid="btn-cancelCampaign-bC4c0" disabled={loading}>Cancelar</button>
                        <button type="submit" className="bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50" data-aid="btn-saveCampaign-bB3d1" disabled={loading}>
                            {loading ? (
                                <><i className="fas fa-spinner fa-spin mr-2" data-aid="i-saveCampaignSpinner-iSC1h2"></i>Salvando...</>
                            ) : (
                                'Salvar Campanha'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function NewMissionTemplateModal({ onClose, campaignId, onCreate }) {
    const [objective, setObjective] = useState('');
    const [templateType, setTemplateType] = useState('WEB_SCRAPE');
    const [context, setContext] = useState('{}');
    const [requiredCapabilities, setRequiredCapabilities] = useState('{}');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const parsedContext = JSON.parse(context);
            const parsedCaps = JSON.parse(requiredCapabilities);
            await onCreate({
                objective,
                templateType,
                context: parsedContext,
                requiredCapabilities: parsedCaps
            });
        } catch (err) {
            setError(err.message || 'Falha ao criar template. Verifique o JSON do contexto/capacidades.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 fade-in" data-aid="div-modalNewTemplate-dM5t3">
             <div className="command-panel rounded-lg p-8 w-full max-w-lg space-y-4" data-aid="div-modalTemplateContent-dK3u4">
                <h3 className="text-2xl font-bold text-emerald-400" data-aid="h3-newTemplateTitle-hJ2v5">Definir Novo Modelo de Missão</h3>
                <p className="text-[var(--text-secondary)]" data-aid="p-templateModalDesc-pTM1f2">Crie um modelo reutilizável para missões dentro desta campanha.</p>
                <form onSubmit={handleSubmit} className="space-y-4" data-aid="form-newTemplate-fI1w6">
                    <div>
                        <label htmlFor="template-objective" className="block text-md font-medium text-[var(--text-primary)] mb-1" data-aid="label-templateObjective-lH9x7">Objetivo do Modelo</label>
                        <input
                            type="text"
                            id="template-objective"
                            className="w-full p-2 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-emerald-500 text-[var(--text-primary)]"
                            placeholder="Ex: Extrair preços de produtos"
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            required
                            disabled={loading}
                            data-aid="input-templateObjective-iG8y8"
                        />
                    </div>
                    <div>
                        <label htmlFor="template-type" className="block text-md font-medium text-[var(--text-primary)] mb-1" data-aid="label-templateType-lF7z9">Tipo de Missão</label>
                        <select
                            id="template-type"
                            className="w-full p-2 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-emerald-500 text-[var(--text-primary)]"
                            value={templateType}
                            onChange={(e) => setTemplateType(e.target.value)}
                            required
                            disabled={loading}
                            data-aid="select-templateType-sTT0a1"
                        >
                            <option value="WEB_SCRAPE" data-aid="option-templateType-ws-oTT2b3">Web Scraping</option>
                            <option value="API_MONITORING" data-aid="option-templateType-api-oTT4c5">Monitoramento de API</option>
                            <option value="IMAGE_RECOGNITION" data-aid="option-templateType-img-oTT6d7">Reconhecimento de Imagens</option>
                            <option value="SENTIMENT_ANALYSIS" data-aid="option-templateType-sent-oTT8e9">Análise de Sentimento</option>
                            <option value="DATA_PROCESSING" data-aid="option-templateType-data-oTT0f1">Processamento de Dados</option>
                            <option value="AI_INSIGHTS" data-aid="option-templateType-ai-oTT2g3">Insights de IA (Gemini)</option>
                            {/* MODIFICATION 1: Add new browser mission types */}
                            <option value="BROWSER_NAVIGATE" data-aid="option-templateType-browserNav-oBN1a2">Navegação em Browser (Ação Direta)</option>
                            <option value="BROWSER_SCREENSHOT" data-aid="option-templateType-browserSs-oBS3b4">Screenshot de Browser (Ação Direta)</option>
                            <option value="BROWSER_GET_HTML" data-aid="option-templateType-browserHtml-oBH5c6">Extrair HTML de Browser (Ação Direta)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="template-context" className="block text-md font-medium text-[var(--text-primary)] mb-1" data-aid="label-templateContext-lTC2b3">Contexto (JSON)</label>
                        <textarea
                            id="template-context"
                            rows="3"
                            className="w-full p-2 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-emerald-500 text-[var(--text-primary)]"
                            placeholder='{ "url": "https://example.com", "selector": "...", "screenshotOptions": {} }' // MODIFICATION 1: Updated placeholder
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            required
                            disabled={loading}
                            data-aid="textarea-templateContext-tTC4c5"
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-1" data-aid="p-templateContextHelp-pTCH6e7">Formato JSON para parâmetros específicos da missão.</p>
                    </div>
                    <div>
                        <label htmlFor="required-capabilities" className="block text-md font-medium text-[var(--text-primary)] mb-1" data-aid="label-requiredCapabilities-lRC6d7">Capacidades Requeridas (JSON)</label>
                        <textarea
                            id="required-capabilities"
                            rows="2"
                            className="w-full p-2 font-mono text-sm rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] focus:ring-2 focus:ring-emerald-500 text-[var(--text-primary)]"
                            placeholder='{ "gpu": true, "ram_gb": 16 }'
                            value={requiredCapabilities}
                            onChange={(e) => setRequiredCapabilities(e.target.value)}
                            disabled={loading}
                            data-aid="textarea-requiredCapabilities-tRC8e9"
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-1" data-aid="p-requiredCapsHelp-pRC0f1">Agentes com estas capacidades serão priorizados para esta missão.</p>
                    </div>
                    {error && <p className="text-red-400 text-sm" data-aid="p-templateError-pTE2g3">{error}</p>}
                    <div className="flex justify-end space-x-4 pt-4" data-aid="div-templateFormActions-dTF4h5">
                        <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-bold py-2 px-4 rounded-md transition" data-aid="btn-cancelTemplate-bCT6i7" disabled={loading}>Cancelar</button>
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50" data-aid="btn-saveTemplate-bST8j9" disabled={loading}>
                            {loading ? (
                                <><i className="fas fa-spinner fa-spin mr-2" data-aid="i-saveTemplateSpinner-iST0k1"></i>Salvando...</>
                            ) : (
                                'Salvar Modelo'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function App() {
    const { token, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" data-aid="div-appLoading-aL4m5">
                <h1 className="text-xl font-bold text-teal-400" data-aid="h1-authCheck-aC5n6">
                    <i className="fas fa-shield-alt mr-3" data-aid="i-authIcon-aI6o7"></i>Verificando Autorização de Acesso...
                </h1>
            </div>
        );
    }

    return (
        <Fragment>
            {token ? <Dashboard data-aid="dashboard-main-dM5n6" /> : <AuthView data-aid="authView-main-aV6o7"/>}
        </Fragment>
    );
}

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        <ToastProvider>
            <SettingsProvider>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </SettingsProvider>
        </ToastProvider>
    </React.StrictMode>
);
```
