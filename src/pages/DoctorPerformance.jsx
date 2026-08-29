import { useState, useEffect } from 'react';
import { getDoctorDashboard, updateConsultationPrice } from '../utils/api';
import { useLang } from '../context/LangContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';

export default function DoctorPerformance() {
  const { lang } = useLang();
  const toast = useToast();
  const ar = lang === 'ar';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState('');
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // silent=true → لا تعرض شاشة تحميل كاملة، فقط تحديث في الخلفية
  const loadDoctorDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getDoctorDashboard();
      const perf = res.data || res; // backend returns { success, data: {...} }
      setData(perf);
      if (perf.consultation_price !== undefined && perf.consultation_price !== null) {
        setPrice(String(perf.consultation_price));
      }
    } catch (err) {
      toast(err.detail || err.message || (ar ? 'فشل تحميل بيانات الأداء' : 'Failed to load performance data'), 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorDashboard();
  }, []);

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(price);
    if (!price || isNaN(parsed) || parsed < 0) {
      toast(ar ? 'يرجى إدخال سعر استشارة صحيح' : 'Please enter a valid consultation price', 'warning');
      return;
    }
    setUpdatingPrice(true);
    try {
      await updateConsultationPrice(parsed);
      toast(ar ? 'تم تحديث سعر الكشف بنجاح' : 'Consultation price updated successfully', 'success');
      loadDoctorDashboard(true); // silent: لا تعرض Skeleton
    } catch (err) {
      const msg = typeof err.detail === 'string' ? err.detail : (Array.isArray(err.detail) ? err.detail[0]?.msg : err.message) || (ar ? 'حدث خطأ أثناء تحديث سعر الكشف' : 'Failed to update consultation price');
      toast(msg, 'error');
    } finally {
      setUpdatingPrice(false);
    }
  };

  if (loading) {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton style={{ height: 40, width: 220, borderRadius: 8 }} />
        <Skeleton style={{ height: 130, borderRadius: 14 }} />
        <Skeleton style={{ height: 200, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          👨‍⚕️ {ar ? 'لوحة أداء الطبيب' : 'Doctor Performance Dashboard'}
        </h2>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}
          onClick={() => loadDoctorDashboard(true)}>
          🔄 {ar ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Consultation Price Card */}
      <div className="card" style={{ padding: 22, borderRadius: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          💲 {ar ? 'تعديل سعر الكشف / الاستشارة' : 'Update Consultation Price'}
        </h3>
        <form onSubmit={handleUpdatePrice} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-field"
            required
            placeholder="0.00"
            style={{ width: 180 }}
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={updatingPrice} style={{ padding: '9px 20px', fontSize: 13 }}>
            {updatingPrice ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ السعر' : 'Update Price')}
          </button>
          {data?.consultation_price != null && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {ar ? 'الحالي:' : 'Current: '}
              <strong style={{ color: 'var(--primary)' }}>💲{data.consultation_price}</strong>
            </span>
          )}
        </form>
      </div>

      {/* Performance Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            {ar ? 'إجمالي عدد المرضى' : 'Patient Count'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: 'var(--primary)' }}>
            {data?.patient_count ?? 0}
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            {ar ? 'نسبة عدم الحضور' : 'No-Show Rate'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: '#D32F2F' }}>
            {data?.no_show_rate ? `${(data.no_show_rate * 100).toFixed(1)}%` : '0%'}
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            {ar ? 'نسبة الإشغال' : 'Occupancy Rate'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: '#1976D2' }}>
            {data?.occupancy_rate ? `${(data.occupancy_rate * 100).toFixed(1)}%` : '0%'}
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            {ar ? 'إجمالي الإيرادات' : 'Revenue'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: '#388E3C' }}>
            ${data?.revenue?.toLocaleString() ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}
