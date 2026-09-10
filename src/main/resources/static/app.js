const { useState, useEffect, useCallback } = React;

const API_BASE = '/api/v1';

function Toast({ toast, onClose }) {
    if (!toast) return null;
    const isError = toast.type === 'error';
    return (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-bounce-short">
            <div className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border ${
                isError 
                    ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200' 
                    : 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            } backdrop-blur-md`}>
                <div className="text-xl">
                    {isError ? '⚠️' : '✅'}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold">{isError ? 'Error' : 'Success'}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm ml-2">✕</button>
            </div>
        </div>
    );
}

function App() {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('wallet_theme');
        if (saved) return saved;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('wallet_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('wallet_user');
        return saved ? JSON.parse(saved) : null;
    });

    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const [activeModal, setActiveModal] = useState(null);

    const [authMode, setAuthMode] = useState('login');
    const [authForm, setAuthForm] = useState({
        username: '',
        email: '',
        password: '',
        initialDeposit: '500.00'
    });

    const [transferForm, setTransferForm] = useState({
        receiverWalletId: '2',
        amount: '50.00',
        description: 'Payment',
        simulateFailure: false
    });

    const [amountForm, setAmountForm] = useState({ amount: '100.00', description: 'Top-up' });

    const [bankForm, setBankForm] = useState({
        accountNumber: '987654321012',
        bankName: 'JPMorgan Chase Bank'
    });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const authFetch = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        if (user && user.accessToken) {
            headers['Authorization'] = `Bearer ${user.accessToken}`;
        }
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            handleLogout();
            throw new Error('Session expired. Please log in again.');
        }
        return res;
    }, [user]);

    const loadDashboardData = useCallback(async () => {
        if (!user || !user.walletId) return;
        setLoading(true);
        try {
            const wRes = await authFetch(`${API_BASE}/wallets/${user.walletId}`);
            if (wRes.ok) {
                const wData = await wRes.json();
                setWallet(wData);
            }

            const txRes = await authFetch(`${API_BASE}/transactions/wallet/${user.walletId}?page=0&size=20`);
            if (txRes.ok) {
                const txData = await txRes.json();
                setTransactions(txData.content || []);
            }

            const bRes = await authFetch(`${API_BASE}/bank-accounts/user/${user.userId}`);
            if (bRes.ok) {
                const bData = await bRes.json();
                setBankAccounts(bData || []);
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [user, authFetch]);

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user, loadDashboardData]);

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = authMode === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
            const payload = authMode === 'login' 
                ? { username: authForm.username, password: authForm.password }
                : {
                    username: authForm.username,
                    email: authForm.email,
                    password: authForm.password,
                    initialDeposit: parseFloat(authForm.initialDeposit) || 0
                };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Authentication failed');
            }

            localStorage.setItem('wallet_user', JSON.stringify(data));
            setUser(data);
            showToast(`Welcome, ${data.username}`);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('wallet_user');
        setUser(null);
        setWallet(null);
        setTransactions([]);
        setBankAccounts([]);
        showToast('Logged out', 'info');
    };

    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                senderWalletId: user.walletId,
                receiverWalletId: parseInt(transferForm.receiverWalletId),
                amount: parseFloat(transferForm.amount),
                description: transferForm.description,
                simulateFailure: transferForm.simulateFailure
            };

            const res = await authFetch(`${API_BASE}/transactions/transfer`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                if (transferForm.simulateFailure) {
                    throw new Error(`Transaction rolled back as requested: ${data.message}`);
                }
                throw new Error(data.message || 'Transfer failed');
            }

            showToast(`Transferred $${payload.amount} successfully (Ref #${data.id})`);
            setActiveModal(null);
            loadDashboardData();
        } catch (err) {
            showToast(err.message, 'error');
            loadDashboardData();
        } finally {
            setLoading(false);
        }
    };

    const handleDepositSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/wallets/${user.walletId}/deposit`, {
                method: 'POST',
                body: JSON.stringify({ amount: parseFloat(amountForm.amount) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Deposit failed');

            showToast(`Deposited $${amountForm.amount}`);
            setActiveModal(null);
            loadDashboardData();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/wallets/${user.walletId}/withdraw`, {
                method: 'POST',
                body: JSON.stringify({ amount: parseFloat(amountForm.amount) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Withdrawal failed');

            showToast(`Withdrew $${amountForm.amount}`);
            setActiveModal(null);
            loadDashboardData();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBankSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/bank-accounts/user/${user.userId}`, {
                method: 'POST',
                body: JSON.stringify(bankForm)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to link account');

            showToast(`Linked ${data.bankName} (${data.accountNumber})`);
            setActiveModal(null);
            loadDashboardData();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen transition-colors duration-200 flex flex-col">
            <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="text-xl">💳</span>
                        </div>
                        <div>
                            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                ApexWallet
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 block -mt-0.5">Secure Banking API</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 live-indicator"></span>
                            <span>PostgreSQL: <strong className="text-emerald-600 dark:text-emerald-400">Secure Payment</strong></span>
                        </div>

                        <a 
                            href="/swagger-ui.html" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 font-medium"
                        >
                            <span>⚡</span> Swagger
                        </a>

                        <button
                            onClick={toggleTheme}
                            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition flex items-center justify-center text-sm shadow-sm"
                        >
                            {theme === 'dark' ? (
                                <span className="flex items-center gap-1 text-amber-400">☀️ <span className="text-[11px] font-medium hidden md:inline text-slate-300">Light</span></span>
                            ) : (
                                <span className="flex items-center gap-1 text-indigo-600">🌙 <span className="text-[11px] font-medium hidden md:inline text-slate-700">Dark</span></span>
                            )}
                        </button>

                        {user ? (
                            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
                                <div className="text-right hidden md:block">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{user.username}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Wallet #{user.walletId}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition font-medium"
                                >
                                    Log Out
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!user ? (
                    <div className="max-w-md mx-auto my-12">
                        <div className="glass-panel p-8 rounded-2xl shadow-2xl">
                            <div className="text-center mb-6">
                                <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-600/20 items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 text-2xl border border-indigo-500/30">
                                    🔐
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Secure Digital Banking</h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">JWT Authenticated Banking Engine</p>
                            </div>

                            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-6 border border-slate-200 dark:border-slate-800">
                                <button
                                    onClick={() => setAuthMode('login')}
                                    className={`py-2 text-xs font-semibold rounded-lg transition ${
                                        authMode === 'login' 
                                            ? 'bg-indigo-600 text-white shadow-md' 
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => setAuthMode('register')}
                                    className={`py-2 text-xs font-semibold rounded-lg transition ${
                                        authMode === 'register' 
                                            ? 'bg-indigo-600 text-white shadow-md' 
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    Register
                                </button>
                            </div>

                            <form onSubmit={handleAuthSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Username</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Username"
                                        value={authForm.username}
                                        onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                                    />
                                </div>

                                {authMode === 'register' && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="user@example.com"
                                            value={authForm.email}
                                            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Password</label>
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••••••"
                                        value={authForm.password}
                                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                                    />
                                </div>

                                {authMode === 'register' && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Initial Deposit ($ USD)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={authForm.initialDeposit}
                                            onChange={(e) => setAuthForm({ ...authForm, initialDeposit: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition duration-200"
                                >
                                    {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Register Account')}
                                </button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800/80">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center mb-3">Quick Profiles</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuthMode('login');
                                            setAuthForm({ username: 'prakash', password: 'MySecurePassword123!', email: '', initialDeposit: '500.00' });
                                        }}
                                        className="text-xs py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition text-center"
                                    >
                                        👤 <strong>Prakash</strong>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuthMode('login');
                                            setAuthForm({ username: 'alex', password: 'MySecurePassword123!', email: '', initialDeposit: '200.00' });
                                        }}
                                        className="text-xs py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition text-center"
                                    >
                                        👤 <strong>Alex</strong>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                            <div className="lg:col-span-5 flex flex-col">
                                <div className="platinum-card h-56 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative text-white">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">💳</span>
                                            <span className="font-bold text-sm tracking-wider text-indigo-200">APEX PLATINUM</span>
                                        </div>
                                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/15 text-white backdrop-blur-md">
                                            WALLET #{wallet ? wallet.id : user.walletId}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 my-auto">
                                        <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-yellow-400 shadow-md border border-amber-400/50 flex flex-col justify-around p-1">
                                            <div className="h-0.5 bg-amber-700/40 rounded"></div>
                                            <div className="h-0.5 bg-amber-700/40 rounded"></div>
                                        </div>
                                        <span className="text-lg text-white/80">📡</span>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] uppercase font-mono tracking-widest text-indigo-300/90 mb-0.5">Cardholder</p>
                                            <p className="font-bold text-base tracking-wide text-white uppercase">{user.username}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-mono tracking-widest text-indigo-300/90 mb-0.5">Balance</p>
                                            <p className="font-mono-nums text-xl font-extrabold text-emerald-400">
                                                ${wallet ? Number(wallet.balance).toFixed(2) : '0.00'} <span className="text-xs font-normal text-slate-200">{wallet ? wallet.currency : 'USD'}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-7 glass-panel rounded-2xl p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Digital wallet fund management</p>
                                        </div>
                                        <button 
                                            onClick={loadDashboardData}
                                            disabled={loading}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
                                        >
                                            <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                                        <button
                                            onClick={() => setActiveModal('transfer')}
                                            className="p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/15 dark:hover:bg-indigo-600/25 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 flex flex-col items-center justify-center gap-2 transition group"
                                        >
                                            <span className="text-2xl group-hover:scale-110 transition">💸</span>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">Send Money</span>
                                        </button>
                                        <button
                                            onClick={() => setActiveModal('deposit')}
                                            className="p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/15 dark:hover:bg-emerald-600/25 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex flex-col items-center justify-center gap-2 transition group"
                                        >
                                            <span className="text-2xl group-hover:scale-110 transition">💳</span>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">Deposit</span>
                                        </button>
                                        <button
                                            onClick={() => setActiveModal('withdraw')}
                                            className="p-4 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-600/15 dark:hover:bg-amber-600/25 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 flex flex-col items-center justify-center gap-2 transition group"
                                        >
                                            <span className="text-2xl group-hover:scale-110 transition">🏧</span>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">Withdraw</span>
                                        </button>
                                        <button
                                            onClick={() => setActiveModal('bank')}
                                            className="p-4 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-600/15 dark:hover:bg-purple-600/25 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 flex flex-col items-center justify-center gap-2 transition group"
                                        >
                                            <span className="text-2xl group-hover:scale-110 transition">🏦</span>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">Link Bank</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300">
                                    <div className="flex items-center gap-2">
                                        <span className="text-indigo-500 dark:text-indigo-400">🛡️</span>
                                        <span>Pessimistic write locking enabled</span>
                                    </div>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200">READ_COMMITTED</span>
                                </div>
                            </div>
                        </div>

                        {bankAccounts.length > 0 && (
                            <div className="glass-panel p-6 rounded-2xl">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span>🏦</span> Linked Accounts ({bankAccounts.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {bankAccounts.map((acc) => (
                                        <div key={acc.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{acc.bankName}</p>
                                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">{acc.accountNumber}</p>
                                            </div>
                                            <span className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">VERIFIED</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="glass-panel rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Transaction Ledger</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Recent account activity</p>
                                </div>
                                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                    {transactions.length} entries
                                </span>
                            </div>

                            {transactions.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                                    No transactions recorded yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                                <th className="py-3.5 px-6">ID</th>
                                                <th className="py-3.5 px-6">Type</th>
                                                <th className="py-3.5 px-6">From / To</th>
                                                <th className="py-3.5 px-6 text-right">Amount</th>
                                                <th className="py-3.5 px-6 text-center">Status</th>
                                                <th className="py-3.5 px-6 text-right">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                                            {transactions.map((tx) => {
                                                const isOutgoing = tx.senderWalletId === user.walletId;
                                                const isDeposit = !tx.senderWalletId && tx.receiverWalletId === user.walletId;
                                                const isWithdraw = tx.senderWalletId === user.walletId && !tx.receiverWalletId;

                                                return (
                                                    <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition">
                                                        <td className="py-4 px-6 font-mono text-xs text-slate-500 dark:text-slate-400">#{tx.id}</td>
                                                        <td className="py-4 px-6">
                                                            {isDeposit ? (
                                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">DEPOSIT</span>
                                                            ) : isWithdraw ? (
                                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">WITHDRAWAL</span>
                                                            ) : isOutgoing ? (
                                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">SENT</span>
                                                            ) : (
                                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">RECEIVED</span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-xs font-mono text-slate-700 dark:text-slate-300">
                                                            {tx.senderWalletId ? `Wallet #${tx.senderWalletId}` : 'External'} &rarr; {tx.receiverWalletId ? `Wallet #${tx.receiverWalletId}` : 'External'}
                                                        </td>
                                                        <td className={`py-4 px-6 text-right font-mono-nums font-bold ${
                                                            isOutgoing ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                                        }`}>
                                                            {isOutgoing ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                                                        </td>
                                                        <td className="py-4 px-6 text-center">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                                tx.status === 'SUCCESS' 
                                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' 
                                                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                                                            }`}>
                                                                {tx.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6 text-right text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                            {new Date(tx.timestamp).toLocaleTimeString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {activeModal === 'transfer' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl modal-content">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>💸</span> Transfer Funds
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleTransferSubmit} className="space-y-4 mt-6">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Sender</label>
                                <input
                                    type="text"
                                    disabled
                                    value={`Wallet #${user.walletId} (${user.username})`}
                                    className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 dark:text-slate-400 font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Recipient Wallet ID</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    placeholder="Wallet ID"
                                    value={transferForm.receiverWalletId}
                                    onChange={(e) => setTransferForm({ ...transferForm, receiverWalletId: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Amount ($ USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    value={transferForm.amount}
                                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                />
                                <div className="flex gap-2 mt-2">
                                    {['25.00', '50.00', '100.00', '250.00'].map((amt) => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setTransferForm({ ...transferForm, amount: amt })}
                                            className="text-xs py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono"
                                        >
                                            ${amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl border transition ${
                                transferForm.simulateFailure 
                                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200' 
                                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold flex items-center gap-1.5 cursor-pointer" htmlFor="rollback-toggle">
                                        <span>🧪</span> Simulate Rollback
                                    </label>
                                    <input
                                        id="rollback-toggle"
                                        type="checkbox"
                                        checked={transferForm.simulateFailure}
                                        onChange={(e) => setTransferForm({ ...transferForm, simulateFailure: e.target.checked })}
                                        className="h-4 w-4 rounded accent-rose-500 cursor-pointer"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    Forces a failure after debit to test database rollback.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 px-4 text-white text-sm font-bold rounded-xl shadow-lg transition duration-200 ${
                                    transferForm.simulateFailure 
                                        ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30' 
                                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                                }`}
                            >
                                {loading ? 'Processing...' : (transferForm.simulateFailure ? 'Execute with Simulated Failure' : 'Send Funds')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeModal === 'deposit' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl modal-content">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>💳</span> Deposit Funds
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleDepositSubmit} className="space-y-4 mt-6">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Amount ($ USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    value={amountForm.amount}
                                    onChange={(e) => setAmountForm({ ...amountForm, amount: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition"
                            >
                                {loading ? 'Processing...' : 'Deposit Funds'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeModal === 'withdraw' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl modal-content">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>🏧</span> Withdraw Funds
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleWithdrawSubmit} className="space-y-4 mt-6">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Amount ($ USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    value={amountForm.amount}
                                    onChange={(e) => setAmountForm({ ...amountForm, amount: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-600/30 transition"
                            >
                                {loading ? 'Processing...' : 'Withdraw Funds'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeModal === 'bank' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl modal-content">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>🏦</span> Link Bank
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleBankSubmit} className="space-y-4 mt-6">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Bank Name"
                                    value={bankForm.bankName}
                                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Account Number</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Account Number"
                                    value={bankForm.accountNumber}
                                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-600/30 transition"
                            >
                                {loading ? 'Linking...' : 'Link Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
