import { useState, useEffect } from 'react';
import { Download, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getOwnerDashboard, exportOwnerDashboard } from '../utils/api';
import { useLang } from '../context/LangContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';

export default function OwnerDashboard() {
  const { lang } = useLang();
  const toast = useToast();
  const ar = lang === 'ar';

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState(null);

  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    doctor_id: '',
    specialization: ''
  });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Clean empty string filters
      const activeFilters = {};
      Object.keys(filters).forEach(k => {
        if (filters[k]) activeFilters[k] = filters[k];
      });
      const res = await getOwnerDashboard(activeFilters);
      setData(res);
    } catch (err) {
      toast(err.detail || err.message || (ar ? 'حدث خطأ أثناء تحميل لوحة التحليلات' : 'Failed to load dashboard data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [filters]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const blob = await exportOwnerDashboard(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `owner_dashboard_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast(ar ? 'تم تحميل التقرير بنجاح' : 'Report exported successfully', 'success');
    } catch (err) {
      toast(err.detail || (ar ? 'حدث خطأ أثناء تصدير التقرير' : 'Export failed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton style={{ height: 60, borderRadius: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <Skeleton style={{ height: 100, borderRadius: 12 }} />
          <Skeleton style={{ height: 100, borderRadius: 12 }} />
          <Skeleton style={{ height: 100, borderRadius: 12 }} />
          <Skeleton style={{ height: 100, borderRadius: 12 }} />
        </div>
        <Skeleton style={{ height: 300, borderRadius: 12 }} />
      </div>
    );
  }

  const doctorPerformance = data?.doctor_performance || [];
  const patientInsights = data?.patient_insights || {};
  const incomeReport = data?.income_report || {};
  const expenseReport = data?.expense_report || {};

  // Map revenue by doctor object { [doc_id]: "amount" } to array for chart
  const doctorNameMap = {};
  doctorPerformance.forEach(d => { doctorNameMap[d.doctor_id] = d.doctor_name; });

  // Build revenueByDoctor with fallback to doctorPerformance if incomeReport is empty
  let revenueByDoctor = Object.entries(incomeReport.income_by_doctor || {}).map(([doc_id, amt]) => ({
    doctor_name: doctorNameMap[doc_id] || (ar ? 'دكتور' : 'Doctor'),
    revenue: parseFloat(amt) || 0
  }));

  if (revenueByDoctor.length === 0 && doctorPerformance.length > 0) {
    revenueByDoctor = doctorPerformance.map(d => ({
      doctor_name: d.doctor_name || (ar ? 'دكتور' : 'Doctor'),
      revenue: parseFloat(d.total_revenue || d.revenue || 0)
    }));
  }

  let revenueBySpecialization = Object.entries(incomeReport.income_by_specialization || {}).map(([spec, amt]) => ({
    specialization: spec,
    revenue: parseFloat(amt) || 0
  }));

  if (revenueBySpecialization.length === 0 && doctorPerformance.length > 0) {
    revenueBySpecialization = doctorPerformance.map(d => ({
      specialization: d.specialization || (ar ? 'عام' : 'General'),
      revenue: parseFloat(d.total_revenue || d.revenue || 0)
    }));
  }

  const netProfit = parseFloat(expenseReport.net_profit || 0);
  const totalRevenue = parseFloat(incomeReport.total_income || 0);
  const newPatients = patientInsights.new_patients_count || 0;
  const recurringPatients = patientInsights.recurring_patients_count || 0;

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header & Export Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          📊 {ar ? 'لوحة تحليلات مالك العيادة' : 'Owner Performance Dashboard'}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: 13 }}
          >
            <Download size={15} /> {ar ? 'تصدير Excel' : 'Export Excel'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: 13 }}
          >
            <Download size={15} /> {ar ? 'تصدير PDF' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: 18, borderRadius: 14, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
          <Filter size={16} color="var(--primary)" />
          {ar ? 'الفلاتر:' : 'Filters:'}
        </div>
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
        <input
          type="text"
          className="input-field"
          style={{ width: 160, padding: '6px 12px', fontSize: 13 }}
          placeholder={ar ? 'معرف الدكتور' : 'Doctor ID'}
          value={filters.doctor_id}
          onChange={e => setFilters({ ...filters, doctor_id: e.target.value })}
        />
        <input
          type="text"
          className="input-field"
          style={{ width: 160, padding: '6px 12px', fontSize: 13 }}
          placeholder={ar ? 'التخصص' : 'Specialization'}
          value={filters.specialization}
          onChange={e => setFilters({ ...filters, specialization: e.target.value })}
        />
        {(filters.date_from || filters.date_to || filters.doctor_id || filters.specialization) && (
          <button
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setFilters({ date_from: '', date_to: '', doctor_id: '', specialization: '' })}
          >
            {ar ? 'إعادة ضبط' : 'Reset'}
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{ar ? 'إجمالي الأرباح الصافية' : 'Net Profit'}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: '#2E7D32' }}>
            ${netProfit.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{ar ? 'مرضى جدد' : 'New Patients'}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: 'var(--primary)' }}>
            {newPatients}
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{ar ? 'مرضى متكررون' : 'Recurring Patients'}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: '#8E24AA' }}>
            {recurringPatients}
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{ar ? 'مجموع الايرادات' : 'Total Revenue'}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: '#1565C0' }}>
            ${totalRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Revenue by Doctor Chart */}
        <div className="card" style={{ padding: 20, borderRadius: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            {ar ? 'الإيرادات حسب الطبيب' : 'Revenue by Doctor'}
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByDoctor}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="doctor_name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#1E88E5" radius={[6, 6, 0, 0]} name={ar ? 'الإيراد' : 'Revenue'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Specialization Chart */}
        <div className="card" style={{ padding: 20, borderRadius: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            {ar ? 'الإيرادات حسب التخصص' : 'Revenue by Specialization'}
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBySpecialization}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="specialization" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#43A047" radius={[6, 6, 0, 0]} name={ar ? 'الإيراد' : 'Revenue'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Doctor Performance Table */}
      <div className="card" style={{ padding: 20, borderRadius: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          👨‍⚕️ {ar ? 'جدول أداء الأطباء' : 'Doctor Performance Table'}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: ar ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)', fontSize: 13, color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px' }}>{ar ? 'اسم الدكتور' : 'Doctor Name'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'عدد المرضى' : 'Patient Count'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'نسبة عدم الحضور (No-Show)' : 'No-Show Rate'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'نسبة الإشغال (Occupancy)' : 'Occupancy Rate'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'الإيرادات' : 'Revenue'}</th>
              </tr>
            </thead>
            <tbody>
              {doctorPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    {ar ? 'لا توجد بيانات متاحة' : 'No performance data available'}
                  </td>
                </tr>
              ) : doctorPerformance.map((doc, idx) => (
                <tr key={doc.doctor_id || idx} style={{ borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>{doc.doctor_name || doc.name}</td>
                  <td style={{ padding: '12px 14px' }}>{doc.patient_count || 0}</td>
                  <td style={{ padding: '12px 14px', color: '#D32F2F', fontWeight: 600 }}>
                    {doc.no_show_rate ? `${(doc.no_show_rate * 100).toFixed(1)}%` : '0%'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#1976D2', fontWeight: 600 }}>
                    {doc.occupancy_rate ? `${(doc.occupancy_rate * 100).toFixed(1)}%` : '0%'}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#388E3C' }}>
                    ${(parseFloat(doc.total_revenue || doc.revenue || 0)).toLocaleString()}
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
