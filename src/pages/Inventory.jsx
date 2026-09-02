import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Plus, Check } from 'lucide-react';
import { getSupplies, createSupply, updateSupply, recordConsumption, getSupplyConsumptions } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';

export default function Inventory() {
  const { user } = useAuth();
  const { lang } = useLang();
  const toast = useToast();
  const ar = lang === 'ar';

  const isOwner = user?.role === 'clinic_owner';
  const isDoctor = user?.role === 'doctor';

  const [supplies, setSupplies] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Owner supply modal
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [editingSupply, setEditingSupply] = useState(null);
  const [supplyForm, setSupplyForm] = useState({ name: '', quantity: 0, low_stock_threshold: 10, unit: 'pcs' });
  const [savingSupply, setSavingSupply] = useState(false);

  // Doctor consumption modal
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [consumeSupply, setConsumeSupply] = useState(null);
  const [consumeQty, setConsumeQty] = useState(1);
  const [savingConsume, setSavingConsume] = useState(false);

  const loadSupplies = async () => {
    setLoading(true);
    try {
      const data = await getSupplies();
      setSupplies(data.supplies || data || []);
      if (isOwner) {
        const consData = await getSupplyConsumptions().catch(() => []);
        setConsumptions(consData || []);
      }
    } catch (err) {
      toast(err.detail || err.message || (ar ? 'فشل تحميل المخزون' : 'Failed to load inventory'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupplies();
  }, []);

  const handleSaveSupply = async (e) => {
    e.preventDefault();
    setSavingSupply(true);
    const payload = {
      name: supplyForm.name,
      current_stock: parseFloat(supplyForm.quantity) || 0,
      low_stock_threshold: parseFloat(supplyForm.low_stock_threshold) || 10,
      unit: supplyForm.unit || 'pcs'
    };
    try {
      if (editingSupply) {
        await updateSupply(editingSupply.id, payload);
        toast(ar ? 'تم تعديل المستلزم بنجاح' : 'Supply updated successfully', 'success');
      } else {
        await createSupply(payload);
        toast(ar ? 'تم إضافة المستلزم بنجاح' : 'Supply created successfully', 'success');
      }
      setShowSupplyModal(false);
      setEditingSupply(null);
      setSupplyForm({ name: '', quantity: 0, low_stock_threshold: 10, unit: 'pcs' });
      loadSupplies();
    } catch (err) {
      const msg = typeof err.detail === 'string' ? err.detail : (Array.isArray(err.detail) ? err.detail[0]?.msg : err.message) || (ar ? 'حدث خطأ أثناء الحفظ' : 'Failed to save supply');
      toast(msg, 'error');
    } finally {
      setSavingSupply(false);
    }
  };

  const handleRecordConsumption = async (e) => {
    e.preventDefault();
    if (!consumeSupply) return;
    setSavingConsume(true);
    try {
      await recordConsumption({
        supply_id: consumeSupply.id,
        quantity_used: parseInt(consumeQty) || 1
      });
      toast(ar ? 'تم تسجيل الاستهلاك بنجاح' : 'Consumption recorded', 'success');
      setShowConsumeModal(false);
      setConsumeSupply(null);
      setConsumeQty(1);
      loadSupplies();
    } catch (err) {
      const msg = typeof err.detail === 'string' ? err.detail : (Array.isArray(err.detail) ? err.detail[0]?.msg : err.message) || (ar ? 'حدث خطأ أثناء تسجيل الاستهلاك' : 'Failed to record consumption');
      toast(msg, 'error');
    } finally {
      setSavingConsume(false);
    }
  };

  if (loading) {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton style={{ height: 40, width: 220, borderRadius: 8 }} />
        <Skeleton style={{ height: 280, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          📦 {ar ? 'إدارة المخزون والمستلزمات' : 'Inventory & Supplies Management'}
        </h2>
        {isOwner && (
          <button
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => {
              setEditingSupply(null);
              setSupplyForm({ name: '', quantity: 0, low_stock_threshold: 10, unit: 'pcs' });
              setShowSupplyModal(true);
            }}
          >
            <Plus size={16} /> {ar ? 'إضافة مستلزم' : 'Add Supply'}
          </button>
        )}
      </div>

      {/* Supplies Table */}
      <div className="card" style={{ padding: 20, borderRadius: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: ar ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)', fontSize: 13, color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px' }}>{ar ? 'اسم العنصر' : 'Item Name'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'الكمية الحالية' : 'Current Stock'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'حد التنبيه' : 'Low Threshold'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'الوحدة' : 'Unit'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'الحالة' : 'Status'}</th>
                <th style={{ padding: '10px 14px' }}>{ar ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {supplies.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    {ar ? 'لا يوجد مستلزمات في المخزن' : 'No inventory items available'}
                  </td>
                </tr>
              ) : supplies.map((sup, idx) => {
                const currentStock = sup.quantity ?? sup.current_stock ?? 0;
                const threshold = sup.low_stock_threshold ?? 10;
                const isLow = currentStock <= threshold;

                return (
                  <tr key={sup.id || idx} style={{ borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{sup.name}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{currentStock}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{threshold}</td>
                    <td style={{ padding: '12px 14px' }}>{sup.unit || 'pcs'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {isLow ? (
                        <span style={{
                          padding: '4px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700,
                          background: '#FFEBEE', color: '#C62828', display: 'inline-flex', alignItems: 'center', gap: 4
                        }}>
                          <AlertTriangle size={13} /> {ar ? 'مخزون منخفض' : 'Low Stock'}
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700,
                          background: '#E8F5E9', color: '#2E7D32', display: 'inline-flex', alignItems: 'center', gap: 4
                        }}>
                          <Check size={13} /> {ar ? 'متوفر' : 'Normal'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {isOwner && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => {
                              setEditingSupply(sup);
                              setSupplyForm({
                                name: sup.name,
                                quantity: currentStock,
                                low_stock_threshold: threshold,
                                unit: sup.unit || 'pcs'
                              });
                              setShowSupplyModal(true);
                            }}
                          >
                            {ar ? 'تعديل' : 'Edit'}
                          </button>
                        )}
                        {isDoctor && (
                          <button
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => {
                              setConsumeSupply(sup);
                              setConsumeQty(1);
                              setShowConsumeModal(true);
                            }}
                          >
                            {ar ? 'تسجيل استهلاك' : 'Record Consumption'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doctor Consumptions Log (Owner Only) */}
      {isOwner && (
        <div className="card" style={{ padding: 20, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-main)' }}>
            📋 {ar ? 'سجل سحوبات الأطباء من المخزن' : 'Doctor Inventory Consumption Log'}
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: ar ? 'right' : 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', fontSize: 13, color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>{ar ? 'اسم الطبيب' : 'Doctor Name'}</th>
                  <th style={{ padding: '10px 14px' }}>{ar ? 'المستلزم المسحوب' : 'Item Name'}</th>
                  <th style={{ padding: '10px 14px' }}>{ar ? 'الكمية المستهلكة' : 'Consumed Qty'}</th>
                  <th style={{ padding: '10px 14px' }}>{ar ? 'الوحدة' : 'Unit'}</th>
                  <th style={{ padding: '10px 14px' }}>{ar ? 'تاريخ السحب' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {consumptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                      {ar ? 'لا توجد عمليات سحب مسجلة حتى الآن' : 'No consumption records found'}
                    </td>
                  </tr>
                ) : consumptions.map((c, idx) => (
                  <tr key={c.id || idx} style={{ borderBottom: '1px solid var(--border-light)', fontSize: 13.5 }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--primary)' }}>👨‍⚕️ {c.doctor_name}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{c.supply_name}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#C62828' }}>-{c.quantity_used}</td>
                    <td style={{ padding: '10px 14px' }}>{c.unit}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                      {c.date ? new Date(c.date).toLocaleString(ar ? 'ar-EG' : 'en-US') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Owner Add/Edit Modal */}
      {showSupplyModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'grid', placeItems: 'center', padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24, borderRadius: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
              {editingSupply ? (ar ? 'تعديل مستلزم' : 'Edit Supply') : (ar ? 'إضافة مستلزم جديد' : 'Add New Supply')}
            </h3>
            <form onSubmit={handleSaveSupply} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">{ar ? 'اسم المستلزم *' : 'Supply Name *'}</label>
                <input
                  className="input-field"
                  required
                  value={supplyForm.name}
                  onChange={e => setSupplyForm({ ...supplyForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{ar ? 'الكمية' : 'Quantity'}</label>
                <input
                  type="number"
                  className="input-field"
                  required
                  value={supplyForm.quantity}
                  onChange={e => setSupplyForm({ ...supplyForm, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="label">{ar ? 'حد المخزون المنخفض (Low Threshold)' : 'Low Stock Threshold'}</label>
                <input
                  type="number"
                  className="input-field"
                  required
                  value={supplyForm.low_stock_threshold}
                  onChange={e => setSupplyForm({ ...supplyForm, low_stock_threshold: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="label">{ar ? 'الوحدة (مثال: علبة، قطعة)' : 'Unit (e.g. pcs, box)'}</label>
                <input
                  className="input-field"
                  value={supplyForm.unit}
                  onChange={e => setSupplyForm({ ...supplyForm, unit: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn-primary" disabled={savingSupply} style={{ flex: 1, padding: 10 }}>
                  {savingSupply ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ' : 'Save')}
                </button>
                <button type="button" className="btn-secondary" style={{ padding: 10 }} onClick={() => setShowSupplyModal(false)}>
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Consumption Modal */}
      {showConsumeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'grid', placeItems: 'center', padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 24, borderRadius: 16 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>
              {ar ? 'تسجيل استهلاك مستلزم' : 'Record Supply Consumption'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              {consumeSupply?.name} ({ar ? 'الكمية المتاحة:' : 'Available:'} {consumeSupply?.quantity ?? consumeSupply?.current_stock ?? 0})
            </p>
            <form onSubmit={handleRecordConsumption} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">{ar ? 'الكمية المستهلكة' : 'Consumed Quantity'}</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  required
                  value={consumeQty}
                  onChange={e => setConsumeQty(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn-primary" disabled={savingConsume} style={{ flex: 1, padding: 10 }}>
                  {savingConsume ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'تأكيد الاستهلاك' : 'Confirm')}
                </button>
                <button type="button" className="btn-secondary" style={{ padding: 10 }} onClick={() => setShowConsumeModal(false)}>
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
