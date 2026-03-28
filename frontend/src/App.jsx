import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const AuthContext = createContext();

function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const login = (t, u) => { localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); setToken(t); setUser(u); };
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(null); setUser(null); };
  const api = axios.create({ baseURL: API, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return <AuthContext.Provider value={{ token, user, login, logout, api }}>{children}</AuthContext.Provider>;
}

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark px-3 shadow-sm">
      <Link className="navbar-brand fw-bold" to="/dashboard">
        StockFlow
      </Link>
      <div className="navbar-nav ms-auto d-flex align-items-center gap-1">
        <Link className="nav-link" to="/dashboard">Dashboard</Link>
        <Link className="nav-link" to="/products">Products</Link>
        <Link className="nav-link" to="/settings">Settings</Link>
        <span className="nav-link text-secondary d-none d-md-inline">|</span>
        <span className="nav-link text-light opacity-75 d-none d-md-inline small">{user?.orgName}</span>
        <button className="btn btn-outline-light btn-sm ms-2" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, token } = useAuth();
  const navigate = useNavigate();
  if (token) return <Navigate to="/dashboard" />;
  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      login(res.data.token, res.data.user); navigate('/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Login failed'); }
    setLoading(false);
  };
  return (
    <div className="auth-bg d-flex align-items-center justify-content-center min-vh-100">
      <div className="card auth-card shadow-lg border-0">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4"><h2 className="fw-bold mt-2">StockFlow</h2><p className="text-muted">Sign in to your account</p></div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3"><label className="form-label">Email</label><input type="email" className="form-control form-control-lg" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div className="mb-4"><label className="form-label">Password</label><input type="password" className="form-control form-control-lg" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
          <p className="text-center mt-3 mb-0">Don't have an account? <Link to="/signup" className="text-decoration-none">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, token } = useAuth();
  const navigate = useNavigate();
  if (token) return <Navigate to="/dashboard" />;
  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/signup`, { email, password, orgName });
      login(res.data.token, res.data.user); navigate('/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Signup failed'); }
    setLoading(false);
  };
  return (
    <div className="auth-bg d-flex align-items-center justify-content-center min-vh-100">
      <div className="card auth-card shadow-lg border-0">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4"><h2 className="fw-bold mt-2">Create Account</h2><p className="text-muted">Start managing your inventory</p></div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3"><label className="form-label">Organization Name</label><input type="text" className="form-control form-control-lg" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. My Store" required /></div>
            <div className="mb-3"><label className="form-label">Email</label><input type="email" className="form-control form-control-lg" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div className="mb-3"><label className="form-label">Password</label><input type="password" className="form-control form-control-lg" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <div className="mb-4"><label className="form-label">Confirm Password</label><input type="password" className="form-control form-control-lg" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
            <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>{loading ? 'Creating account...' : 'Sign Up'}</button>
          </form>
          <p className="text-center mt-3 mb-0">Already have an account? <Link to="/login" className="text-decoration-none">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { api } = useAuth();
  const [data, setData] = useState({ totalProducts: 0, totalQuantity: 0, lowStockItems: [], globalThreshold: 5 });
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  return (
    <div className="container py-4">
      <h3 className="fw-bold mb-4">Dashboard</h3>
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card stat-card border-0 shadow-sm h-100">
            <div className="card-body text-center p-4">
              <h2 className="fw-bold mb-1 mt-3">{data.totalProducts}</h2>
              <p className="text-muted mb-0">Total Products</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card stat-card border-0 shadow-sm h-100">
            <div className="card-body text-center p-4">
              <h2 className="fw-bold mb-1 mt-3">{data.totalQuantity}</h2>
              <p className="text-muted mb-0">Total Quantity</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card stat-card border-0 shadow-sm h-100">
            <div className="card-body text-center p-4">
              <h2 className="fw-bold mb-1 mt-3">{data.lowStockItems.length}</h2>
              <p className="text-muted mb-0">Low Stock Items</p>
            </div>
          </div>
        </div>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3"><h5 className="mb-0 fw-semibold">Low Stock Items</h5></div>
        <div className="card-body p-0">
          {data.lowStockItems.length === 0 ? (
            <div className="text-center py-5 text-muted"><p className="mb-0">All products are well stocked!</p></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light"><tr><th>Name</th><th>SKU</th><th>Quantity</th><th>Threshold</th></tr></thead>
                <tbody>
                  {data.lowStockItems.map(p => (
                    <tr key={p._id}>
                      <td className="fw-medium">{p.name}</td>
                      <td><code>{p.sku}</code></td>
                      <td><span className="badge bg-danger">{p.quantity}</span></td>
                      <td>{p.lowStockThreshold ?? data.globalThreshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductsPage() {
  const { api } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', description: '', quantity: 0, costPrice: 0, sellingPrice: 0, lowStockThreshold: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = () => api.get('/products').then(r => { setProducts(r.data); setLoading(false); }).catch(console.error);
  useEffect(() => { load(); }, []);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm({ name: '', sku: '', description: '', quantity: 0, costPrice: 0, sellingPrice: 0, lowStockThreshold: '' }); setError(''); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, sku: p.sku, description: p.description || '', quantity: p.quantity, costPrice: p.costPrice, sellingPrice: p.sellingPrice, lowStockThreshold: p.lowStockThreshold ?? '' }); setError(''); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setError(''); };

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    const payload = { ...form, quantity: Number(form.quantity), costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice), lowStockThreshold: form.lowStockThreshold === '' ? null : Number(form.lowStockThreshold) };
    try {
      if (editing) { await api.put(`/products/${editing._id}`, payload); }
      else { await api.post('/products', payload); }
      closeForm(); load();
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/products/${deleteId}`); setDeleteId(null); load(); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">Products</h3>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>
      <div className="mb-3"><input type="text" className="form-control" placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">{products.length === 0 ? <p>No products yet. Click "Add Product" to get started!</p> : <p>No products match your search.</p>}</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light"><tr><th>Name</th><th>SKU</th><th>Quantity</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p._id}>
                      <td className="fw-medium">{p.name}</td>
                      <td><code>{p.sku}</code></td>
                      <td>{p.quantity}</td>
                      <td>{p.sellingPrice > 0 ? `$${p.sellingPrice.toFixed(2)}` : '-'}</td>
                      <td>{p.quantity <= (p.lowStockThreshold ?? 5) ? <span className="badge bg-danger">Low Stock</span> : <span className="badge bg-success">In Stock</span>}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(p)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(p._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0"><h5 className="modal-title fw-bold">{editing ? 'Edit Product' : 'Add Product'}</h5><button className="btn-close" onClick={closeForm}></button></div>
              <div className="modal-body">
                {error && <div className="alert alert-danger py-2">{error}</div>}
                <form onSubmit={handleSave}>
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="col-md-6"><label className="form-label">SKU *</label><input className="form-control" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required /></div>
                    <div className="col-12"><label className="form-label">Description</label><textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="col-md-4"><label className="form-label">Quantity</label><input type="number" className="form-control" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                    <div className="col-md-4"><label className="form-label">Cost Price</label><input type="number" step="0.01" className="form-control" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} /></div>
                    <div className="col-md-4"><label className="form-label">Selling Price</label><input type="number" step="0.01" className="form-control" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} /></div>
                    <div className="col-12"><label className="form-label">Low Stock Threshold</label><input type="number" className="form-control" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: e.target.value })} placeholder="Leave empty to use global default" /></div>
                  </div>
                  <div className="d-flex gap-2 mt-4">
                    <button type="submit" className="btn btn-primary flex-fill" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</button>
                    <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-body text-center py-4">
                <div className="mt-3"></div>
                <h5 className="fw-bold">Delete Product?</h5>
                <p className="text-muted">This action cannot be undone.</p>
                <div className="d-flex gap-2 justify-content-center">
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                  <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  const { api } = useAuth();
  const [threshold, setThreshold] = useState(5);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api.get('/settings').then(r => { setThreshold(r.data.defaultLowStockThreshold); setOrgName(r.data.orgName); setLoading(false); }).catch(console.error); }, []);
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setSaved(false);
    try { await api.put('/settings', { defaultLowStockThreshold: Number(threshold) }); setSaved(true); setTimeout(() => setSaved(false), 3000); } catch (err) { console.error(err); }
    setSaving(false);
  };
  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  return (
    <div className="container py-4">
      <h3 className="fw-bold mb-4">Settings</h3>
      <div className="row">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h5 className="fw-semibold mb-1">Organization</h5>
              <p className="text-muted mb-4">{orgName}</p>
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label fw-medium">Default Low Stock Threshold</label>
                  <input type="number" className="form-control form-control-lg" value={threshold} onChange={e => setThreshold(e.target.value)} min="0" />
                  <div className="form-text">Products without a custom threshold will use this value to determine low stock status.</div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
                {saved && <span className="text-success ms-3">Saved!</span>}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><><Navbar /><DashboardPage /></></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><><Navbar /><ProductsPage /></></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><><Navbar /><SettingsPage /></></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
