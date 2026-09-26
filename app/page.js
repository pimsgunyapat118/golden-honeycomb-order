'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const COLORS = {
  gold: '#C9971E',
  orange: '#E8791A',
  bg: '#FFF8EA',
  card: '#FFFFFF',
  text: '#3B2A0F',
  subtext: '#8A6D3B',
  danger: '#C0392B',
  dangerBg: '#FDECEA',
  border: '#F0DCB0',
};

export default function OrderPage({ params }) {
  // Next.js: params is a Promise in this project's version — always unwrap with use().
  const { tableNumber } = use(params);

  // Session lookup
  const [loadingSession, setLoadingSession] = useState(true);
  const [session, setSession] = useState(null); // { id, adult_count, child_count }
  const [sessionNotFound, setSessionNotFound] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Menu data
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [menuLoading, setMenuLoading] = useState(true);

  // Cart
  const [itemQty, setItemQty] = useState({}); // { [itemId]: 1-5 }
  const [cart, setCart] = useState([]); // [{ itemId, name, quantity }]
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Bill / checkout
  const [showBillConfirm, setShowBillConfirm] = useState(false);
  const [billLoading, setBillLoading] = useState(false);
  const [billSummary, setBillSummary] = useState(null); // { adultCount, childCount, totalItems }
  const [closingSession, setClosingSession] = useState(false);

  useEffect(() => {
    async function loadSession() {
      setLoadingSession(true);
      setErrorMsg('');
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('id, adult_count, child_count')
          .eq('table_number', Number(tableNumber))
          .eq('status', 'open')
          .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
          setSessionNotFound(true);
        } else {
          setSession(data[0]);
        }
      } catch (err) {
        setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบโต๊ะ');
      } finally {
        setLoadingSession(false);
      }
    }
    loadSession();
  }, [tableNumber]);

  useEffect(() => {
    if (!session) return;

    async function loadMenu() {
      setMenuLoading(true);
      try {
        const [{ data: cats, error: catError }, { data: menuItems, error: itemError }] = await Promise.all([
          supabase.from('menu_categories').select('id, name, sort_order').order('sort_order', { ascending: true }),
          supabase.from('menu_items').select('id, category_id, name'),
        ]);

        if (catError) throw catError;
        if (itemError) throw itemError;

        setCategories(cats || []);
        setItems(menuItems || []);
        if (cats && cats.length > 0) {
          setActiveCategoryId(cats[0].id);
        }
      } catch (err) {
        setErrorMsg(err.message || 'โหลดเมนูไม่สำเร็จ');
      } finally {
        setMenuLoading(false);
      }
    }
    loadMenu();
  }, [session]);

  function handleQtyChange(itemId, value) {
    setItemQty((prev) => ({ ...prev, [itemId]: Number(value) }));
  }

  function handleAddToCart(item) {
    const quantity = itemQty[item.id] || 1;
    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.itemId === item.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }
      return [...prev, { itemId: item.id, name: item.name, quantity }];
    });
  }

  const cartTotalCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  async function handleSubmitOrder() {
    if (!session || cart.length === 0) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const orderItems = cart.map(({ name, quantity }) => ({ name, quantity }));
      const { error } = await supabase.from('orders').insert({
        session_id: session.id,
        table_number: Number(tableNumber),
        items: orderItems,
        status: 'received',
      });

      if (error) throw error;

      setCart([]);
      setSuccessMsg('ส่งออเดอร์แล้ว');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      setErrorMsg(err.message || 'ส่งออเดอร์ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenBill() {
    if (!session) return;
    setBillLoading(true);
    setErrorMsg('');
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('items')
        .eq('session_id', session.id);

      if (error) throw error;

      const totalItems = (orders || []).reduce((sum, row) => {
        const rowItems = Array.isArray(row.items) ? row.items : [];
        return sum + rowItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      }, 0);

      setBillSummary({
        adultCount: session.adult_count,
        childCount: session.child_count,
        totalItems,
      });
      setShowBillConfirm(true);
    } catch (err) {
      setErrorMsg(err.message || 'ดึงข้อมูลยอดไม่สำเร็จ');
    } finally {
      setBillLoading(false);
    }
  }

  async function handleConfirmBill() {
    if (!session) return;
    setClosingSession(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', session.id);

      if (error) throw error;

      setShowBillConfirm(false);
      setSessionClosed(true);
    } catch (err) {
      setErrorMsg(err.message || 'ปิดโต๊ะไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setClosingSession(false);
    }
  }

  // ---- Full-screen states ----

  if (loadingSession) {
    return (
      <main style={styles.fullscreenCenter}>
        <p style={styles.fullscreenText}>กำลังตรวจสอบโต๊ะ...</p>
      </main>
    );
  }

  if (sessionNotFound) {
    return (
      <main style={styles.fullscreenCenter}>
        <p style={styles.fullscreenTitle}>🐝</p>
        <p style={styles.fullscreenText}>
          โต๊ะ/ออเดอร์นี้ยังไม่เปิดใช้งาน
          <br />
          กรุณาแจ้งพนักงานหน้าร้าน
        </p>
      </main>
    );
  }

  if (sessionClosed) {
    return (
      <main style={styles.fullscreenCenter}>
        <p style={styles.fullscreenTitle}>🐝</p>
        <p style={styles.thankYouText}>ขอบคุณที่อุดหนุนรังผึ้งสีทอง</p>
      </main>
    );
  }

  const activeItems = items.filter((item) => item.category_id === activeCategoryId);

  return (
    <main style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div>
          <p style={styles.shopName}>🐝 รังผึ้งสีทอง</p>
          <p style={styles.tableLabel}>โต๊ะ {tableNumber}</p>
        </div>
        <button type="button" onClick={handleOpenBill} style={styles.billBtn} disabled={billLoading}>
          {billLoading ? '...' : 'เรียกเก็บเงิน'}
        </button>
      </div>

      {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}
      {successMsg && <p style={styles.successBanner}>{successMsg}</p>}

      {/* Category tabs */}
      {menuLoading ? (
        <p style={styles.loadingText}>กำลังโหลดเมนู...</p>
      ) : (
        <>
          <div style={styles.tabsRow}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                style={{
                  ...styles.tabBtn,
                  ...(activeCategoryId === cat.id ? styles.tabBtnActive : {}),
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu items */}
          <div style={styles.itemList}>
            {activeItems.length === 0 && <p style={styles.loadingText}>ไม่มีเมนูในหมวดนี้</p>}
            {activeItems.map((item) => (
              <div key={item.id} style={styles.itemCard}>
                <span style={styles.itemName}>{item.name}</span>
                <div style={styles.itemControls}>
                  <select
                    value={itemQty[item.id] || 1}
                    onChange={(e) => handleQtyChange(item.id, e.target.value)}
                    style={styles.qtySelect}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleAddToCart(item)} style={styles.addBtn}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Floating cart bar */}
      {cartTotalCount > 0 && (
        <div style={styles.cartBar}>
          <span style={styles.cartCount}>ตะกร้า: {cartTotalCount} รายการ</span>
          <button type="button" onClick={handleSubmitOrder} style={styles.submitBtn} disabled={submitting}>
            {submitting ? 'กำลังส่ง...' : 'ส่งออเดอร์'}
          </button>
        </div>
      )}

      {/* Bill confirm dialog */}
      {showBillConfirm && billSummary && (
        <div style={styles.overlay}>
          <div style={styles.dialog}>
            <h2 style={styles.dialogTitle}>ยืนยันเรียกเก็บเงิน</h2>
            <div style={styles.dialogBody}>
              <p style={styles.dialogRow}>โต๊ะ {tableNumber}</p>
              <p style={styles.dialogRow}>
                ผู้ใหญ่ {billSummary.adultCount} · เด็ก {billSummary.childCount}
              </p>
              <p style={styles.dialogRow}>สั่งไปแล้วทั้งหมด {billSummary.totalItems} รายการ</p>
            </div>
            {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}
            <div style={styles.dialogActions}>
              <button
                type="button"
                onClick={() => setShowBillConfirm(false)}
                style={styles.secondaryBtn}
                disabled={closingSession}
              >
                ยกเลิก
              </button>
              <button type="button" onClick={handleConfirmBill} style={styles.dangerBtn} disabled={closingSession}>
                {closingSession ? 'กำลังปิด...' : 'ยืนยันปิดโต๊ะ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(180deg, ${COLORS.bg} 0%, #FFF 100%)`,
    fontFamily: 'system-ui, -apple-system, "Noto Sans Thai", sans-serif',
    paddingBottom: '6rem',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
    color: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  shopName: {
    fontSize: '1.2rem',
    fontWeight: 800,
    margin: 0,
  },
  tableLabel: {
    fontSize: '0.95rem',
    margin: 0,
    opacity: 0.95,
  },
  billBtn: {
    fontSize: '1rem',
    fontWeight: 700,
    color: COLORS.text,
    background: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '0.6rem 1rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: '0.95rem',
    padding: '0.5rem 1.25rem 0',
    margin: 0,
  },
  successBanner: {
    background: '#E8F8ED',
    color: '#1E7A3A',
    fontWeight: 700,
    textAlign: 'center',
    padding: '0.6rem',
    margin: '0.75rem 1.25rem 0',
    borderRadius: 10,
  },
  loadingText: {
    textAlign: 'center',
    color: COLORS.subtext,
    padding: '1.5rem',
  },
  tabsRow: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    padding: '1rem 1.25rem 0.5rem',
  },
  tabBtn: {
    fontSize: '1rem',
    fontWeight: 600,
    color: COLORS.text,
    background: '#fff',
    border: `2px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: '0.55rem 1.1rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  tabBtnActive: {
    background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
    color: '#fff',
    border: '2px solid transparent',
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '0.5rem 1.25rem 1rem',
  },
  itemCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: '1rem 1.1rem',
    boxShadow: '0 4px 12px rgba(201, 151, 30, 0.08)',
  },
  itemName: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: COLORS.text,
  },
  itemControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  qtySelect: {
    fontSize: '1rem',
    padding: '0.4rem 0.5rem',
    borderRadius: 8,
    border: `2px solid ${COLORS.border}`,
  },
  addBtn: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#fff',
    background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
    border: 'none',
    borderRadius: 10,
    width: 42,
    height: 42,
    cursor: 'pointer',
    lineHeight: 1,
  },
  cartBar: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    background: COLORS.text,
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    boxShadow: '0 -6px 20px rgba(0,0,0,0.15)',
    zIndex: 30,
  },
  cartCount: {
    fontSize: '1.05rem',
    fontWeight: 700,
  },
  submitBtn: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: COLORS.text,
    background: `linear-gradient(135deg, #FFE9B8, #FFD27A)`,
    border: 'none',
    borderRadius: 12,
    padding: '0.7rem 1.3rem',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(59, 42, 15, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 50,
  },
  dialog: {
    background: '#fff',
    borderRadius: 18,
    padding: '1.5rem',
    width: '100%',
    maxWidth: 380,
    boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
  },
  dialogTitle: {
    fontSize: '1.3rem',
    color: COLORS.text,
    margin: '0 0 1rem',
  },
  dialogBody: {
    background: COLORS.bg,
    borderRadius: 12,
    padding: '0.9rem 1rem',
    marginBottom: '1rem',
  },
  dialogRow: {
    fontSize: '1.05rem',
    color: COLORS.text,
    margin: '0.25rem 0',
  },
  dialogActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  secondaryBtn: {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: COLORS.text,
    background: '#F3F3F3',
    border: 'none',
    borderRadius: 12,
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    flex: 1,
  },
  dangerBtn: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#fff',
    background: COLORS.danger,
    border: 'none',
    borderRadius: 12,
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    flex: 1,
  },
  fullscreenCenter: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: COLORS.bg,
    textAlign: 'center',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, "Noto Sans Thai", sans-serif',
  },
  fullscreenTitle: {
    fontSize: '3rem',
    margin: '0 0 1rem',
  },
  fullscreenText: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: COLORS.text,
    lineHeight: 1.6,
  },
  thankYouText: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: COLORS.gold,
  },
};
