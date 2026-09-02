import { useState, useEffect } from 'react';
import { DollarSign, Plus, Filter } from 'lucide-react';
import { getExpenses, createExpense } from '../utils/api';
import { useLang } from '../context/LangContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';

export default function Expenses() {
  const { lang } = useLang();
  const toast = useToast();
  const ar = lang === 'ar';

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'rent', amount: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({ date_from: '', date_to: '', category: '' });

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const activeFilters = {};
      Object.keys(filters).forEach(k => {
        if (filters[k]) activeFilters[k] = filters[k];
      });
      const data = await getExpenses(activeFilters);
      setExpenses(data.expenses || data || []);
    } catch (err) {
      toast(err.detail || err.message || (ar ? 'فشل تحميل المصاريف' : 'Failed to load expenses'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [filters]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast(ar ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount', 'warning');
      return;
    }
    setSaving(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await createExpense({
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description || undefined,
        expense_date: todayStr
      });
      toast(ar ? 'تم إضافة المصروف بنجاح' : 'Expense recorded successfully', 'success');
      setForm({ category: 'rent', amount: '', description: '' });
      setShowForm(false);
      loadExpenses();
    } catch (err) {
      const msg = typeof err.detail === 'string' ? err.detail : (Array.isArray(err.detail) ? err.detail[0]?.msg : err.message) || (ar ? 'حدث خطأ أثناء إضافة المصروف' : 'Failed to add expense');
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !expenses.length) {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton style={{ height: 40, width: 200, borderRadius: 8 }} />
        <Skeleton style={{ height: 260, borderRadius: 14 }} />
      </div>
    );
  }

  const CATEGORY_LABELS = {
    rent: ar ? 'إيجار (rent)' : 'Rent',
    salaries: ar ? 'رواتب (salaries)' : 'Salaries',
    supplies: ar ? 'مستلزمات (supplies)' : 'Supplies',
    maintenance: ar ? 'صيانة (maintenance)' : 'Maintenance',
    bills: ar ? 'فواتير ومرافق (bills)' : 'Bills'
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          💸 {ar ? 'إدارة المصاريف والتشغيل' : 'Expenses Management'}
        </h2>
        <button
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: 13 }}
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={16} /> {ar ? 'إضافة مصروف' : 'Add Expense'}
        </button>
      </div>

      {/* Expense Form */}
      {showForm && (
        <div className="card" style={{ padding: 22, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
            {ar ? 'تسجيل مصروف جديد' : 'New Expense Entry'}
          </h3>
          <form onSubmit={handleCreateExpense} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div>
                <label className="label">{ar ? 'الفئة (Category) *' : 'Category *'}</label>
                <select
                  className="input-field"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="rent">rent</option>
                  <option value="salaries">salaries</option>
                  <option value="supplies">supplies</option>
                  <option value="maintenance">maintenance</option>
                  <option value="bills">bills</option>
                </select>
              </div>

              <div>
                <label className="label">{ar ? 'المبلغ *' : 'Amount *'}</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  required
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">{ar ? 'الوصف' : 'Description'}</label>
              <input
                className="input-field"
                placeholder={ar ? 'تفاصيل إضافية...' : 'Expense details...'}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '8px 20px', fontSize: 13 }}>
                {saving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ المصروف' : 'Save Expense')}
              </button>
              <button type="button" className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setShowForm(false)}>
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: 16, borderRadius: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
          <Filter size={15} color="var(--primary)" />
          {ar ? 'تصفية:' : 'Filter:'}
        </div>

        <select
          className="input-field"
          style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
          value={filters.category}
          onChange={e => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">{ar ? '-- كل الفئات --' : '-- All Categories --'}</option>
          <option value="rent">rent</option>
          <option value="salaries">salaries</option>
          <option value="supplies">supplies</option>
          <option value="maintenance">maintenance</option>
          <option value="bills">bills</option>
        </select>

        <input
          type="date"
          className="input-field"
          style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
          value={filters.date_from}
          onChange={e => setFilters({ ...filters, date_from: e.target.value })}
        />

        <input
          type="date"
          className="input-field"
          style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
          value={filters.date_to}
          onChange={e => setFilters({ ...filters, date_to: e.target.value })}
        />

        {(filters.category || filters.date_from || filters.date_to) && (
          <button
            className="btn-secondary"
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => setFilters({ category: '', date_from: '', date_to: '' })}
          >
            {ar ? 'إعادة ضبط' : 'Reset'}
          </button>
        )}
      </div>

      {/* Expenses Table */}
      <div className="card" style={{ padding: 20, borderRadius: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: ar ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)', fontSize: 13, color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px' }}>#</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'الفئة' : 'Category'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'المبلغ' : 'Amount'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'الوصف' : 'Description'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    {ar ? 'لا توجد مصاريف مسجلة' : 'No expenses recorded'}
                  </td>
                </tr>
              ) : expenses.map((exp, idx) => (
                <tr key={exp.id || idx} style={{ borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>#{exp.id}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                      background: 'var(--primary-light)', color: 'var(--primary)'
                    }}>
                      {CATEGORY_LABELS[exp.category] || exp.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#C62828' }}>
                    ${exp.amount?.toLocaleString() || 0}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{exp.description || '-'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                    {exp.created_at ? new Date(exp.created_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
