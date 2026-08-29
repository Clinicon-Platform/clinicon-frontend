import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { getMyInvoices, updateInvoicePayment } from '../utils/api';
import { useLang } from '../context/LangContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';

export default function Billing() {
  const { lang } = useLang();
  const toast = useToast();
  const ar = lang === 'ar';

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchPhone, setSearchPhone] = useState('');

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await getMyInvoices();
      setInvoices(data.invoices || data || []);
    } catch (err) {
      toast(err.detail || err.message || (ar ? 'فشل تحميل الفواتير' : 'Failed to load invoices'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchPhone.trim()) return true;
    const term = searchPhone.toLowerCase();
    const phoneMatch = inv.patient_phone?.toLowerCase().includes(term);
    const nameMatch = inv.patient_name?.toLowerCase().includes(term);
    const idMatch = String(inv.id).toLowerCase().includes(term);
    return phoneMatch || nameMatch || idMatch;
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleUpdateStatus = async (invoiceId, payment_method, payment_status) => {
    setUpdatingId(invoiceId);
    try {
      await updateInvoicePayment(invoiceId, { payment_method, payment_status });
      toast(ar ? 'تم تحديث الفاتورة بنجاح' : 'Invoice payment updated successfully', 'success');
      loadInvoices();
    } catch (err) {
      toast(err.detail || (ar ? 'حدث خطأ أثناء تحديث الفاتورة' : 'Failed to update invoice payment'), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton style={{ height: 40, width: 200, borderRadius: 8 }} />
        <Skeleton style={{ height: 300, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          💳 {ar ? 'إدارة الفواتير والمدفوعات' : 'Billing & Invoices Management'}
        </h2>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={loadInvoices}>
          🔄 {ar ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      <div className="card" style={{ padding: 20, borderRadius: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            className="input-field"
            style={{ width: '100%', maxWidth: 350, padding: '10px 14px', fontSize: 14 }}
            placeholder={ar ? '🔍 بحث برقم هاتف المريض أو اسمه...' : '🔍 Search by patient phone or name...'}
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: ar ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)', fontSize: 13, color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px' }}>#</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'اسم المريض' : 'Patient Name'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'المبلغ' : 'Amount'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'طريقة الدفع' : 'Payment Method'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'حالة الدفع' : 'Payment Status'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'التاريخ' : 'Date'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    {ar ? 'لا توجد فواتير' : 'No invoices found'}
                  </td>
                </tr>
              ) : filteredInvoices.map((inv, idx) => {
                const isPaid = inv.payment_status === 'paid';
                return (
                  <tr key={inv.id || idx} style={{ borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>#{inv.id}</td>
                    <td style={{ padding: '12px 14px' }}>{inv.patient_name || inv.patient_id || '-'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>${inv.amount || inv.total || 0}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <select
                        className="input-field"
                        style={{ padding: '4px 8px', fontSize: 13, width: 'auto' }}
                        value={inv.payment_method || 'cash'}
                        disabled={updatingId === inv.id}
                        onChange={(e) => handleUpdateStatus(inv.id, e.target.value, inv.payment_status || 'pending')}
                      >
                        <option value="cash">{ar ? 'نقداً (Cash)' : 'Cash'}</option>
                        <option value="card">{ar ? 'بطاقة (Card)' : 'Card'}</option>
                        <option value="insurance">{ar ? 'تأمين (Insurance)' : 'Insurance'}</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                        background: isPaid ? '#E8F5E9' : '#FFF3E0',
                        color: isPaid ? '#2E7D32' : '#E65100'
                      }}>
                        {isPaid ? (ar ? 'مدفوع' : 'Paid') : (ar ? 'معلق' : 'Pending')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US') : '-'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        className="btn-primary"
                        style={{
                          padding: '5px 12px', fontSize: 12,
                          background: isPaid ? '#E65100' : '#2E7D32',
                          borderColor: isPaid ? '#E65100' : '#2E7D32'
                        }}
                        disabled={updatingId === inv.id}
                        onClick={() => handleUpdateStatus(inv.id, inv.payment_method || 'cash', isPaid ? 'pending' : 'paid')}
                      >
                        {isPaid ? (ar ? 'تحويل لـ معلق' : 'Mark Pending') : (ar ? 'تم الدفع' : 'Mark Paid')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
