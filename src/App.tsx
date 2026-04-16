import React, { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc,
  updateDoc,
  deleteDoc,
  doc 
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { Quote, QuoteItem, QuoteStatus, ItemType } from './types';
import { 
  Plus, 
  Trash2, 
  Save, 
  LogOut, 
  LogIn, 
  FileText, 
  ChevronRight, 
  Package, 
  Wrench,
  User as UserIcon,
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Currency formatter
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<Partial<Quote> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');

  // Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Quotes
  useEffect(() => {
    if (!user) {
      setQuotes([]);
      return;
    }

    const q = query(
      collection(db, 'quotes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quote[];
      setQuotes(quotesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quotes');
    });

    return () => unsubscribe();
  }, [user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = () => signOut(auth);

  const startNewQuote = () => {
    setCurrentQuote({
      clientName: '',
      clientEmail: '',
      date: new Date().toISOString().split('T')[0],
      items: [],
      total: 0,
      status: 'draft',
      userId: user?.uid,
      createdAt: new Date().toISOString()
    });
    setIsEditing(true);
  };

  const handleEditQuote = (quote: Quote) => {
    setCurrentQuote(quote);
    setIsEditing(true);
  };

  const handleSaveQuote = async () => {
    if (!user || !currentQuote) return;

    const data = {
      ...currentQuote,
      total: currentQuote.items?.reduce((acc, item) => acc + item.total, 0) || 0,
      userId: user.uid,
    };

    try {
      if (currentQuote.id) {
        const quoteRef = doc(db, 'quotes', currentQuote.id);
        await updateDoc(quoteRef, { ...data, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'quotes'), {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
      setIsEditing(false);
      setCurrentQuote(null);
    } catch (error) {
      handleFirestoreError(error, currentQuote.id ? OperationType.UPDATE : OperationType.CREATE, 'quotes');
    }
  };

  const handleDeleteQuote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Deseja realmente excluir este orçamento?')) return;
    try {
      await deleteDoc(doc(db, 'quotes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quotes/${id}`);
    }
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      const matchesSearch = q.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [quotes, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
              <FileText size={40} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">GeraOrça</h1>
            <p className="text-gray-600 mb-8">Simplifique sua criação de orçamentos e serviços.</p>
            <button 
              onClick={login}
              className="w-full bg-indigo-600 text-white rounded-xl py-4 font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              Entrar com Google
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-app-bg text-text-main font-sans">
      {/* Sidebar - Aside */}
      <aside className="w-[240px] bg-sidebar border-r border-app-border p-6 flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-2 text-primary font-bold text-xl mb-10 tracking-tight">
          <FileText size={24} />
          <span>GeraOrça</span>
        </div>
        
        <nav className="flex-1">
          <ul className="space-y-1">
            <li 
              className={`px-4 py-3 rounded-lg font-medium cursor-pointer transition ${!isEditing ? 'bg-indigo-50 text-primary' : 'text-text-muted hover:bg-gray-50'}`}
              onClick={() => { setIsEditing(false); setCurrentQuote(null); }}
            >
              Orçamentos
            </li>
            <li className="px-4 py-3 rounded-lg font-medium text-text-muted cursor-pointer hover:bg-gray-50">Clientes</li>
            <li className="px-4 py-3 rounded-lg font-medium text-text-muted cursor-pointer hover:bg-gray-50">Produtos</li>
            <li className="px-4 py-3 rounded-lg font-medium text-text-muted cursor-pointer hover:bg-gray-50">Configurações</li>
          </ul>
        </nav>

        <div className="mt-auto pt-6 border-t border-app-border space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] text-text-muted truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-text-muted hover:text-red-600 transition text-sm font-medium"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen relative">
        <div className="p-8 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                key="editor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                <QuoteEditor 
                  quote={currentQuote!} 
                  onSave={handleSaveQuote} 
                  onCancel={() => { setIsEditing(false); setCurrentQuote(null); }}
                  onChange={setCurrentQuote}
                />
              </motion.div>
            ) : (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-semibold">Orçamentos</h1>
                  <button 
                    onClick={startNewQuote}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Novo Orçamento
                  </button>
                </div>

                <div className="card !p-0 overflow-hidden">
                  <div className="p-4 border-b border-app-border bg-gray-50/50 flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input 
                        type="text" 
                        placeholder="Buscar cliente..." 
                        className="w-full pl-10 pr-4 py-2 bg-white border border-app-border rounded-lg focus:ring-1 focus:ring-primary outline-none transition text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select 
                      className="bg-white border border-app-border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary transition text-xs font-semibold text-text-muted"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | 'all')}
                    >
                      <option value="all">TODOS STATUS</option>
                      <option value="draft">BORRÃO</option>
                      <option value="sent">ENVIADO</option>
                      <option value="approved">APROVADO</option>
                      <option value="rejected">RECUSADO</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse budget-table">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Data</th>
                          <th>Status</th>
                          <th>Total</th>
                          <th className="text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border">
                        {filteredQuotes.length > 0 ? filteredQuotes.map(quote => (
                          <tr 
                            key={quote.id} 
                            className="hover:bg-slate-50 cursor-pointer transition"
                            onClick={() => handleEditQuote(quote)}
                          >
                            <td>
                              <div className="font-semibold">{quote.clientName || 'Sem nome'}</div>
                              <div className="text-[11px] text-text-muted">{quote.clientEmail}</div>
                            </td>
                            <td>
                              {new Date(quote.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td>
                              <span className={`badge ${
                                quote.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                quote.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                                quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {quote.status}
                              </span>
                            </td>
                            <td className="font-bold text-primary">
                              {formatCurrency(quote.total)}
                            </td>
                            <td className="text-right">
                              <button 
                                onClick={(e) => handleDeleteQuote(quote.id, e)}
                                className="p-2 text-text-muted hover:text-rose-600 transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-text-muted">
                              Nenhum orçamento encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function QuoteEditor({ 
  quote, 
  onSave, 
  onCancel, 
  onChange 
}: { 
  quote: Partial<Quote>, 
  onSave: () => void, 
  onCancel: () => void,
  onChange: (q: Partial<Quote>) => void
}) {
  const addItem = (type: ItemType) => {
    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      name: '',
      price: 0,
      quantity: 1,
      total: 0
    };
    onChange({
      ...quote,
      items: [...(quote.items || []), newItem]
    });
  };

  const updateItem = (itemId: string, updates: Partial<QuoteItem>) => {
    const newItems = (quote.items || []).map(item => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates };
        updated.total = updated.price * updated.quantity;
        return updated;
      }
      return item;
    });
    onChange({ ...quote, items: newItems });
  };

  const removeItem = (itemId: string) => {
    onChange({
      ...quote,
      items: (quote.items || []).filter(item => item.id !== itemId)
    });
  };

  const totals = useMemo(() => {
    const items = quote.items || [];
    const prodTotal = items.filter(i => i.type === 'product').reduce((a, b) => a + b.total, 0);
    const servTotal = items.filter(i => i.type === 'service').reduce((a, b) => a + b.total, 0);
    return { prodTotal, servTotal, total: prodTotal + servTotal };
  }, [quote.items]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-app-border transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold">
            {quote.id ? `Orçamento #${quote.id.slice(0, 4)}` : 'Novo Orçamento'}
          </h1>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn btn-outline">Descartar</button>
          <button onClick={onSave} className="btn btn-primary flex items-center gap-2">
            <Save size={18} />
            Salvar Orçamento
          </button>
        </div>
      </div>

      <div className="card client-info grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="form-group">
          <label className="form-label">Cliente</label>
          <input 
            className="w-full bg-transparent border-b border-app-border pb-1 font-medium focus:border-primary outline-none transition"
            value={quote.clientName || ''}
            onChange={(e) => onChange({ ...quote, clientName: e.target.value })}
            placeholder="Nome do cliente"
          />
        </div>
        <div className="form-group">
          <label className="form-label">E-mail</label>
          <input 
            className="w-full bg-transparent border-b border-app-border pb-1 font-medium focus:border-primary outline-none transition"
            value={quote.clientEmail || ''}
            onChange={(e) => onChange({ ...quote, clientEmail: e.target.value })}
            placeholder="contato@cliente.com"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Data de Emissão</label>
          <input 
            type="date"
            className="w-full bg-transparent border-b border-app-border pb-1 font-medium focus:border-primary outline-none transition"
            value={quote.date || ''}
            onChange={(e) => onChange({ ...quote, date: e.target.value })}
          />
        </div>
      </div>

      <div className="card !p-0 overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-4 flex justify-between items-center border-b border-app-border bg-gray-50/50">
          <h2 className="font-semibold text-sm">Itens do Orçamento</h2>
          <div className="flex gap-2">
            <button onClick={() => addItem('product')} className="btn btn-outline !py-1.5 !px-3 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5 ring-1 ring-app-border">
              <Plus size={14} /> Produto
            </button>
            <button onClick={() => addItem('service')} className="btn btn-outline !py-1.5 !px-3 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5 ring-1 ring-app-border">
              <Plus size={14} /> Serviço
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse budget-table">
            <thead>
              <tr>
                <th className="w-32">Tipo</th>
                <th className="min-w-[300px]">Descrição</th>
                <th className="text-center w-24">Qtd</th>
                <th className="text-center w-32">Preço Unit.</th>
                <th className="text-right w-32 pr-6">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {quote.items && quote.items.length > 0 ? quote.items.map(item => (
                <tr key={item.id} className="group">
                  <td>
                    <span className={`badge ${item.type === 'product' ? 'badge-product' : 'badge-service'}`}>
                      {item.type === 'product' ? 'Produto' : 'Serviço'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <input 
                        className="w-full bg-transparent border-b border-transparent group-hover:border-app-border outline-none transition px-1"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        placeholder={item.type === 'product' ? "Nome do produto" : "Descrição do serviço"}
                      />
                    </div>
                  </td>
                  <td className="text-center">
                    <input 
                      type="number"
                      className="w-16 text-center bg-gray-50 border border-transparent group-hover:border-app-border rounded outline-none transition"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                    />
                  </td>
                  <td className="text-center">
                    <div className="flex items-center gap-1 px-4">
                      <span className="text-text-muted text-[10px]">R$</span>
                      <input 
                        type="number"
                        className="flex-1 bg-gray-50 border border-transparent group-hover:border-app-border rounded outline-none transition text-center"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                        step="0.01"
                      />
                    </div>
                  </td>
                  <td className="text-right pr-6 font-semibold">
                    {formatCurrency(item.total)}
                    <button onClick={() => removeItem(item.id)} className="ml-3 opacity-0 group-hover:opacity-100 text-text-muted hover:text-rose-600 transition">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-text-muted italic">
                    Nenhum item adicionado. Clique nos botões acima para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <div className="w-[300px] bg-summary-dark text-white rounded-xl p-6 shadow-xl">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs font-semibold text-gray-400">
              <span>Subtotal Itens</span>
              <span>{formatCurrency(totals.prodTotal)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-gray-400">
              <span>Subtotal Serviços</span>
              <span>{formatCurrency(totals.servTotal)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center border-t border-white/20 pt-4">
            <span className="text-sm font-bold uppercase tracking-wider text-gray-400">Total</span>
            <span className="text-2xl font-bold">{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
