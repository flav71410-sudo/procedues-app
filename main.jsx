import { useState, useEffect, useCallback } from "react";

// ─── SUPABASE CONFIG ────────────────────────────────────────────────────────
// Remplacez ces valeurs par celles de votre projet Supabase
// Dashboard → Settings → API
const SUPABASE_URL = "https://tvplckidketahxupgpfm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cGxja2lka2V0YWh4dXBncGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTA4NzYsImV4cCI6MjA5Nzc4Njg3Nn0.Lfy8UMi800Vejs0HWWILp5taN3PifbRz9au-MZ-QzIY";

// Email de l'administrateur (peut créer / modifier / supprimer)
const ADMIN_EMAIL = "flavien.ruhaut@outlook.fr";

// Client Supabase léger sans SDK (fetch natif)
const supabase = {
  auth: {
    async signInWithPassword(email, password) {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      return r.json();
    },
    async signUp(email, password) {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      return r.json();
    },
    async signOut(token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      });
    },
    async getUser(token) {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      });
      return r.json();
    },
  },
  async query(token, method, path, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: method === "POST" ? "return=representation" : "",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 204) return [];
    return r.json();
  },
};

// ─── CONSTANTES ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "securite",     label: "Sécurité",      color: "#EF4444", icon: "🛡️" },
  { id: "qualite",      label: "Qualité",        color: "#F59E0B", icon: "✅" },
  { id: "maintenance",  label: "Maintenance",    color: "#3B82F6", icon: "🔧" },
  { id: "rh",           label: "RH",             color: "#8B5CF6", icon: "👥" },
  { id: "informatique", label: "Informatique",   color: "#00B4D8", icon: "💻" },
  { id: "autre",        label: "Autre",          color: "#64748B", icon: "📋" },
];

const SAMPLE_PROCEDURES = [
  {
    id: "sample-1",
    title: "Gestion des incidents réseau",
    category: "informatique",
    description: "Procédure de réponse en cas de panne réseau.",
    steps: ["Identifier la panne", "Notifier le responsable IT", "Isoler le segment défaillant", "Appliquer le correctif", "Valider la reprise"],
    author: "Marie D.",
    date: "2026-06-10",
    tags: ["réseau", "incident", "IT"],
  },
  {
    id: "sample-2",
    title: "Contrôle qualité production",
    category: "qualite",
    description: "Vérification des produits en sortie de chaîne.",
    steps: ["Prélever l'échantillon", "Mesurer les dimensions", "Vérifier la conformité visuelle", "Enregistrer les résultats", "Valider ou rejeter le lot"],
    author: "Thomas L.",
    date: "2026-06-15",
    tags: ["qualité", "production", "contrôle"],
  },
];

const INIT_FORM = { title: "", category: "autre", description: "", steps: [""], author: "", tags: "" };

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F0F4F8", minHeight: "100vh", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column" },
  header: { background: "#1E3A5F", color: "#fff", padding: "18px 20px 14px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 },
  headerTitle: { fontSize: 18, fontWeight: 700, flex: 1 },
  headerSub: { fontSize: 12, color: "#90B4D8", marginTop: 2 },
  backBtn: { background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 },
  iconBtn: { background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16 },
  content: { flex: 1, padding: "16px 16px 100px", overflowY: "auto" },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid #E2E8F0", display: "flex", padding: "8px 0 12px", zIndex: 10 },
  navBtn: (a) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "none", background: "none", cursor: "pointer", fontSize: 11, fontWeight: a ? 700 : 500, color: a ? "#1E3A5F" : "#94A3B8" }),
  navIcon: (a) => ({ fontSize: 22, filter: a ? "none" : "grayscale(1) opacity(0.6)" }),
  fab: { position: "fixed", bottom: 80, right: 20, width: 56, height: 56, borderRadius: 28, background: "#00B4D8", color: "#fff", border: "none", fontSize: 26, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,180,216,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 },
  searchBar: { background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "10px 14px", fontSize: 15, width: "100%", outline: "none", boxSizing: "border-box", marginBottom: 14 },
  catScroll: { display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4, scrollbarWidth: "none" },
  catChip: (a, c) => ({ padding: "6px 14px", borderRadius: 20, border: `2px solid ${a ? c : "#E2E8F0"}`, background: a ? c : "#fff", color: a ? "#fff" : "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }),
  card: (c) => ({ background: "#fff", borderRadius: 16, marginBottom: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${c}`, cursor: "pointer" }),
  cardInner: { padding: "14px 16px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#1E293B", flex: 1, lineHeight: 1.3 },
  cardMeta: { fontSize: 12, color: "#94A3B8", marginTop: 6 },
  cardDesc: { fontSize: 13, color: "#64748B", marginTop: 6, lineHeight: 1.5 },
  badge: (c) => ({ background: c + "18", color: c, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, marginLeft: 8, whiteSpace: "nowrap" }),
  tagRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 },
  tag: { background: "#F1F5F9", color: "#64748B", fontSize: 11, padding: "2px 8px", borderRadius: 10 },
  stepsBanner: (c) => ({ background: c + "12", borderTop: `1px solid ${c}22`, padding: "8px 16px", fontSize: 12, color: c, fontWeight: 600 }),
  section: { background: "#fff", borderRadius: 14, padding: "16px", marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 },
  stepRow: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  stepNum: (c) => ({ width: 28, height: 28, borderRadius: 14, background: c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }),
  stepText: { fontSize: 14, color: "#334155", paddingTop: 5, lineHeight: 1.4 },
  detailBanner: (c) => ({ background: `linear-gradient(135deg,${c} 0%,${c}CC 100%)`, color: "#fff", padding: "20px", borderRadius: 14, marginBottom: 12 }),
  detailTitle: { fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 },
  detailMeta: { fontSize: 13, opacity: 0.85 },
  deleteBtn: { width: "100%", background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 12, padding: "12px", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 8 },
  editBtn: { width: "100%", background: "#EFF6FF", color: "#1E3A5F", border: "1.5px solid #BFDBFE", borderRadius: 12, padding: "12px", fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8 },
  label: { fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" },
  input: { width: "100%", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", color: "#1E293B" },
  textarea: { width: "100%", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#1E293B", resize: "none", lineHeight: 1.5, minHeight: 80 },
  formSection: { marginBottom: 18 },
  catGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  catCard: (a, c) => ({ border: `2px solid ${a ? c : "#E2E8F0"}`, background: a ? c + "12" : "#F8FAFC", borderRadius: 10, padding: "10px 6px", textAlign: "center", cursor: "pointer" }),
  catCardLabel: (a, c) => ({ fontSize: 11, fontWeight: 700, color: a ? c : "#94A3B8", marginTop: 4 }),
  stepInput: { flex: 1, background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none" },
  stepRemoveBtn: { background: "#FEF2F2", border: "none", color: "#EF4444", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16 },
  addStepBtn: { background: "#F0F9FF", border: "1.5px dashed #00B4D8", color: "#00B4D8", borderRadius: 10, padding: "10px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" },
  saveBtn: (d) => ({ width: "100%", background: d ? "#CBD5E1" : "#1E3A5F", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 16, fontWeight: 700, cursor: d ? "not-allowed" : "pointer", marginTop: 8 }),
  toast: (c) => ({ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", background: c, color: "#fff", borderRadius: 12, padding: "10px 24px", fontWeight: 700, fontSize: 15, zIndex: 100, boxShadow: `0 4px 16px ${c}66`, whiteSpace: "nowrap" }),
  emptyState: { textAlign: "center", padding: "48px 20px", color: "#94A3B8" },
  // Auth styles
  authWrap: { minHeight: "100vh", background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  authCard: { background: "#fff", borderRadius: 20, padding: "32px 24px", width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  authLogo: { textAlign: "center", fontSize: 48, marginBottom: 8 },
  authTitle: { textAlign: "center", fontSize: 22, fontWeight: 800, color: "#1E293B", marginBottom: 4 },
  authSub: { textAlign: "center", fontSize: 14, color: "#94A3B8", marginBottom: 24 },
  authInput: { width: "100%", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", color: "#1E293B", marginBottom: 12 },
  authBtn: (d) => ({ width: "100%", background: d ? "#CBD5E1" : "#1E3A5F", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 16, fontWeight: 700, cursor: d ? "not-allowed" : "pointer", marginTop: 4 }),
  authSwitch: { textAlign: "center", marginTop: 16, fontSize: 14, color: "#64748B" },
  authSwitchLink: { color: "#00B4D8", fontWeight: 700, cursor: "pointer", background: "none", border: "none", fontSize: 14 },
  authError: { background: "#FEF2F2", color: "#EF4444", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: "center" },
  adminBadge: { background: "#F59E0B18", color: "#D97706", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, display: "inline-block" },
  userBadge: { background: "#00B4D818", color: "#0284C7", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, display: "inline-block" },
  readonlyNote: { background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#0369A1", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 },
};

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("sb_token") || null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Vérifier le token au démarrage
  useEffect(() => {
    if (!token) { setAuthLoading(false); return; }
    supabase.auth.getUser(token).then((u) => {
      if (u.email) setUser(u);
      else { setToken(null); localStorage.removeItem("sb_token"); }
      setAuthLoading(false);
    });
  }, []);

  const handleLogin = (t, u) => {
    localStorage.setItem("sb_token", t);
    setToken(t);
    setUser(u);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut(token);
    localStorage.removeItem("sb_token");
    setToken(null);
    setUser(null);
  };

  if (authLoading) return (
    <div style={{ ...S.authWrap }}>
      <div style={{ color: "#fff", fontSize: 16 }}>Chargement…</div>
    </div>
  );

  if (!token || !user) return <AuthScreen onLogin={handleLogin} />;

  const isAdmin = user.email === ADMIN_EMAIL;
  return <ProceduresApp token={token} user={user} isAdmin={isAdmin} onLogout={handleLogout} />;
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await supabase.auth.signInWithPassword(email, password);
        if (res.error) { setError(res.error.message || "Identifiants incorrects."); }
        else { onLogin(res.access_token, res.user); }
      } else {
        const res = await supabase.auth.signUp(email, password);
        if (res.error) { setError(res.error.message || "Inscription échouée."); }
        else { setSuccess("Compte créé ! Vérifiez votre email pour confirmer, puis connectez-vous."); setMode("login"); }
      }
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    }
    setLoading(false);
  };

  return (
    <div style={S.authWrap}>
      <div style={S.authCard}>
        <div style={S.authLogo}>📋</div>
        <div style={S.authTitle}>Procédures</div>
        <div style={S.authSub}>{mode === "login" ? "Connectez-vous pour accéder aux procédures" : "Créez votre compte"}</div>

        {error && <div style={S.authError}>⚠️ {error}</div>}
        {success && <div style={{ ...S.authError, background: "#F0FDF4", color: "#16A34A" }}>✅ {success}</div>}

        <div style={S.formSection}>
          <label style={S.label}>Email</label>
          <input style={S.authInput} type="email" placeholder="vous@exemple.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>
        <div style={S.formSection}>
          <label style={S.label}>Mot de passe</label>
          <input style={S.authInput} type="password" placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        <button style={S.authBtn(loading)} onClick={handleSubmit} disabled={loading}>
          {loading ? "⏳ En cours…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>

        <div style={S.authSwitch}>
          {mode === "login" ? (
            <>Pas encore de compte ?{" "}
              <button style={S.authSwitchLink} onClick={() => { setMode("signup"); setError(""); }}>S'inscrire</button></>
          ) : (
            <>Déjà un compte ?{" "}
              <button style={S.authSwitchLink} onClick={() => { setMode("login"); setError(""); }}>Se connecter</button></>
          )}
        </div>

        <div style={{ marginTop: 20, padding: "12px", background: "#F8FAFC", borderRadius: 10, fontSize: 12, color: "#94A3B8" }}>
          <strong style={{ color: "#475569" }}>ℹ️ Accès :</strong><br />
          • <strong>Utilisateurs</strong> : consultation uniquement<br />
          • <strong>Admin</strong> ({ADMIN_EMAIL}) : création, modification, suppression
        </div>
      </div>
    </div>
  );
}

// ─── PROCEDURES APP ───────────────────────────────────────────────────────────
function ProceduresApp({ token, user, isAdmin, onLogout }) {
  const [screen, setScreen] = useState("list");
  const [procedures, setProcedures] = useState(SAMPLE_PROCEDURES);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(INIT_FORM);
  const [editMode, setEditMode] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null); // { msg, color }
  const [loading, setLoading] = useState(false);

  const getCat = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[5];

  const showToast = (msg, color = "#10B981") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2000);
  };

  // Charger depuis Supabase (si configuré)
  const loadProcedures = useCallback(async () => {
    if (SUPABASE_URL.includes("VOTRE_PROJECT")) return; // démo locale
    try {
      const data = await supabase.query(token, "GET", "procedures?order=created_at.desc");
      if (Array.isArray(data)) setProcedures(data);
    } catch { /* silencieux en démo */ }
  }, [token]);

  useEffect(() => { loadProcedures(); }, [loadProcedures]);

  const filtered = procedures.filter((p) => {
    const matchCat = filterCat === "all" || p.category === filterCat;
    const q = searchQuery.toLowerCase();
    return matchCat && (!q || p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.tags?.some((t) => t.toLowerCase().includes(q)));
  });

  const addStep = () => setForm((f) => ({ ...f, steps: [...f.steps, ""] }));
  const updateStep = (i, v) => setForm((f) => ({ ...f, steps: f.steps.map((s, idx) => idx === i ? v : s) }));
  const removeStep = (i) => setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    const payload = {
      ...form,
      steps: form.steps.filter((s) => s.trim()),
      tags: typeof form.tags === "string" ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : form.tags,
      date: new Date().toISOString().slice(0, 10),
    };

    if (SUPABASE_URL.includes("VOTRE_PROJECT")) {
      // Mode démo local
      if (editMode && selected) {
        const updated = { ...selected, ...payload };
        setProcedures((p) => p.map((pr) => pr.id === selected.id ? updated : pr));
        setSelected(updated);
        showToast("✅ Procédure mise à jour !");
        setScreen("detail");
      } else {
        const newProc = { id: Date.now().toString(), ...payload };
        setProcedures((p) => [newProc, ...p]);
        showToast("✅ Procédure enregistrée !");
        setScreen("list");
      }
    } else {
      try {
        if (editMode && selected) {
          await supabase.query(token, "PATCH", `procedures?id=eq.${selected.id}`, payload);
          showToast("✅ Mise à jour réussie !");
          setScreen("detail");
        } else {
          await supabase.query(token, "POST", "procedures", payload);
          showToast("✅ Procédure enregistrée !");
          setScreen("list");
        }
        await loadProcedures();
      } catch { showToast("❌ Erreur d'enregistrement", "#EF4444"); }
    }
    setForm(INIT_FORM);
    setEditMode(false);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette procédure ?")) return;
    if (SUPABASE_URL.includes("VOTRE_PROJECT")) {
      setProcedures((p) => p.filter((pr) => pr.id !== id));
    } else {
      await supabase.query(token, "DELETE", `procedures?id=eq.${id}`);
      await loadProcedures();
    }
    showToast("🗑️ Procédure supprimée", "#64748B");
    setScreen("list");
  };

  const startEdit = (proc) => {
    setForm({ ...proc, tags: Array.isArray(proc.tags) ? proc.tags.join(", ") : proc.tags });
    setEditMode(true);
    setScreen("add");
  };

  // ── LIST
  if (screen === "list") return (
    <div style={S.app}>
      {toast && <div style={S.toast(toast.color)}>{toast.msg}</div>}
      <div style={S.header}>
        <div style={{ flex: 1 }}>
          <div style={S.headerTitle}>📋 Procédures</div>
          <div style={S.headerSub}>
            {isAdmin ? <span style={{ ...S.adminBadge, fontSize: 11 }}>👑 Admin</span> : <span style={{ ...S.userBadge, fontSize: 11 }}>👁️ Lecture seule</span>}
            {" "}{user.email}
          </div>
        </div>
        <button style={S.iconBtn} onClick={onLogout} title="Déconnexion">⎋</button>
      </div>
      <div style={S.content}>
        <input style={S.searchBar} placeholder="🔍  Rechercher…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <div style={S.catScroll}>
          <button style={S.catChip(filterCat === "all", "#1E3A5F")} onClick={() => setFilterCat("all")}>Toutes</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} style={S.catChip(filterCat === c.id, c.color)} onClick={() => setFilterCat(c.id)}>{c.icon} {c.label}</button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={S.emptyState}>
            <div style={{ fontSize: 48 }}>📂</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#475569", marginTop: 12 }}>Aucune procédure trouvée</div>
            {isAdmin && <div style={{ fontSize: 13, marginTop: 6 }}>Créez votre première procédure avec le bouton +</div>}
          </div>
        ) : filtered.map((proc) => {
          const cat = getCat(proc.category);
          return (
            <div key={proc.id} style={S.card(cat.color)} onClick={() => { setSelected(proc); setScreen("detail"); }}>
              <div style={S.cardInner}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>{proc.title}</div>
                  <span style={S.badge(cat.color)}>{cat.icon} {cat.label}</span>
                </div>
                <div style={S.cardMeta}>Par {proc.author} · {proc.date}</div>
                <div style={S.cardDesc}>{proc.description}</div>
                {proc.tags?.length > 0 && (
                  <div style={S.tagRow}>{proc.tags.map((t, i) => <span key={i} style={S.tag}>#{t}</span>)}</div>
                )}
              </div>
              <div style={S.stepsBanner(cat.color)}>{proc.steps?.length || 0} étape{proc.steps?.length > 1 ? "s" : ""}</div>
            </div>
          );
        })}
      </div>
      {isAdmin && <button style={S.fab} onClick={() => { setEditMode(false); setForm(INIT_FORM); setScreen("add"); }}>＋</button>}
      <div style={S.bottomNav}>
        <button style={S.navBtn(true)}><span style={S.navIcon(true)}>📋</span>Liste</button>
        {isAdmin && <button style={S.navBtn(false)} onClick={() => { setEditMode(false); setForm(INIT_FORM); setScreen("add"); }}><span style={S.navIcon(false)}>✏️</span>Créer</button>}
        <button style={S.navBtn(false)} onClick={onLogout}><span style={S.navIcon(false)}>⎋</span>Quitter</button>
      </div>
    </div>
  );

  // ── DETAIL
  if (screen === "detail" && selected) {
    const cat = getCat(selected.category);
    return (
      <div style={S.app}>
        {toast && <div style={S.toast(toast.color)}>{toast.msg}</div>}
        <div style={S.header}>
          <button style={S.backBtn} onClick={() => setScreen("list")}>←</button>
          <div style={S.headerTitle}>Détail</div>
          {isAdmin && <span style={S.adminBadge}>👑 Admin</span>}
        </div>
        <div style={S.content}>
          {!isAdmin && (
            <div style={S.readonlyNote}>
              <span style={{ fontSize: 18 }}>👁️</span>
              <span>Mode consultation — seul l'administrateur peut modifier.</span>
            </div>
          )}
          <div style={S.detailBanner(cat.color)}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{cat.icon}</div>
            <div style={S.detailTitle}>{selected.title}</div>
            <div style={S.detailMeta}>{cat.label} · Par {selected.author} · {selected.date}</div>
          </div>
          <div style={S.section}>
            <div style={S.sectionLabel}>Description</div>
            <div style={{ fontSize: 15, color: "#334155", lineHeight: 1.6 }}>{selected.description}</div>
          </div>
          <div style={S.section}>
            <div style={S.sectionLabel}>Étapes ({selected.steps?.length || 0})</div>
            {selected.steps?.map((step, i) => (
              <div key={i} style={S.stepRow}>
                <div style={S.stepNum(cat.color)}>{i + 1}</div>
                <div style={S.stepText}>{step}</div>
              </div>
            ))}
          </div>
          {selected.tags?.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionLabel}>Tags</div>
              <div style={S.tagRow}>{selected.tags.map((t, i) => <span key={i} style={S.tag}>#{t}</span>)}</div>
            </div>
          )}
          {isAdmin && (
            <>
              <button style={S.editBtn} onClick={() => startEdit(selected)}>✏️ Modifier cette procédure</button>
              <button style={S.deleteBtn} onClick={() => handleDelete(selected.id)}>🗑️ Supprimer cette procédure</button>
            </>
          )}
        </div>
        <div style={S.bottomNav}>
          <button style={S.navBtn(false)} onClick={() => setScreen("list")}><span style={S.navIcon(false)}>📋</span>Liste</button>
          {isAdmin && <button style={S.navBtn(false)} onClick={() => startEdit(selected)}><span style={S.navIcon(false)}>✏️</span>Modifier</button>}
          <button style={S.navBtn(false)} onClick={onLogout}><span style={S.navIcon(false)}>⎋</span>Quitter</button>
        </div>
      </div>
    );
  }

  // ── ADD / EDIT (admin only)
  if (screen === "add") return (
    <div style={S.app}>
      {toast && <div style={S.toast(toast.color)}>{toast.msg}</div>}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => { setScreen(editMode ? "detail" : "list"); setEditMode(false); setForm(INIT_FORM); }}>←</button>
        <div style={S.headerTitle}>{editMode ? "✏️ Modifier" : "Nouvelle procédure"}</div>
        <span style={S.adminBadge}>👑 Admin</span>
      </div>
      <div style={S.content}>
        <div style={S.formSection}>
          <label style={S.label}>Titre *</label>
          <input style={S.input} placeholder="Ex : Gestion des incidents…" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div style={S.formSection}>
          <label style={S.label}>Catégorie</label>
          <div style={S.catGrid}>
            {CATEGORIES.map((c) => (
              <div key={c.id} style={S.catCard(form.category === c.id, c.color)} onClick={() => setForm((f) => ({ ...f, category: c.id }))}>
                <div style={{ fontSize: 22 }}>{c.icon}</div>
                <div style={S.catCardLabel(form.category === c.id, c.color)}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={S.formSection}>
          <label style={S.label}>Description</label>
          <textarea style={S.textarea} placeholder="Décrivez brièvement cette procédure…"
            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div style={S.formSection}>
          <label style={S.label}>Étapes</label>
          {form.steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <div style={{ ...S.stepNum(getCat(form.category).color), flexShrink: 0 }}>{i + 1}</div>
              <input style={S.stepInput} placeholder={`Étape ${i + 1}…`} value={step}
                onChange={(e) => updateStep(i, e.target.value)} />
              {form.steps.length > 1 && <button style={S.stepRemoveBtn} onClick={() => removeStep(i)}>×</button>}
            </div>
          ))}
          <button style={S.addStepBtn} onClick={addStep}>+ Ajouter une étape</button>
        </div>
        <div style={S.formSection}>
          <label style={S.label}>Auteur</label>
          <input style={S.input} placeholder="Votre nom…" value={form.author}
            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
        </div>
        <div style={S.formSection}>
          <label style={S.label}>Tags (séparés par des virgules)</label>
          <input style={S.input} placeholder="Ex : sécurité, urgence, réseau" value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
        </div>
        <button style={S.saveBtn(!form.title.trim() || loading)} onClick={handleSave} disabled={!form.title.trim() || loading}>
          {loading ? "⏳ Enregistrement…" : editMode ? "💾 Enregistrer les modifications" : "💾 Créer la procédure"}
        </button>
      </div>
      <div style={S.bottomNav}>
        <button style={S.navBtn(false)} onClick={() => setScreen("list")}><span style={S.navIcon(false)}>📋</span>Liste</button>
        <button style={S.navBtn(true)}><span style={S.navIcon(true)}>✏️</span>{editMode ? "Modifier" : "Créer"}</button>
        <button style={S.navBtn(false)} onClick={onLogout}><span style={S.navIcon(false)}>⎋</span>Quitter</button>
      </div>
    </div>
  );
}
