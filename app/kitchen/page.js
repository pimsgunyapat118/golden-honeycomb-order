'use client';
import { supabase } from '@/lib/supabaseClient';

// หมายเหตุ: หน้านี้ใช้ Supabase Realtime — ต้องเปิด Realtime replication
// ให้ตาราง "orders" ไว้ที่ Supabase Dashboard > Database > Replication ก่อนใช้งานจริง

const COLORS = {
  gold: '#C9971E',
  orange: '#E8791A',
  bg: '#FFF8EA',
  card: '#FFFFFF',
  cooking: '#FFF3D6',
  cookingBorder: '#E8791A',
  text: '#3B2A0F',
  subtext: '#8A6D3B',
  danger: '#C0392B',
};

const ACTIVE_STATUSES = ['received', 'cooking'];

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadInitialOrders() {
      setLoading(true);
      setErrorMsg('');
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, table_number, items, status, created_at')
          .in('status', ACTIVE_STATUSES)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (isMounted) setOrders(data || []);
      } catch (err) {
        if (isMounted) setErrorMsg(err.message || 'โหลดออเดอร์ไม่สำเร็จ');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialOrders();

    function upsertOrder(row) {
      setOrders((prev) => {
        const withoutRow = prev.filter((o) => o.id !== row.id);
        if (!ACTIVE_STATUSES.includes(row.status)) {
          // status moved to something else (e.g. 'served') — drop it from the board
          return withoutRow;
        }
        return [...withoutRow, row].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    }

    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        upsertOrder(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        upsertOrder(payload.new);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleStartCooking(orderId) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'cooking' } : o)));
    const { error } = await supabase.from('orders').update({ status: 'cooking' }).eq('id', orderId);
    if (error) setErrorMsg(error.message || 'อัปเดตสถานะไม่สำเร็จ');
  }

  async function handleServed(orderId) {
    // เอาการ์ดออกจากจอทันที ไม่ต้องรอ realtime
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    const { error } = await supabase.from('orders').update({ status: 'served' }).eq('id', orderId);
    if (error) setErrorMsg(error.message || 'อัปเดตสถานะไม่สำเร็จ');
  }

  function formatTime(createdAt) {
    try {
      return new Date(createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🐝 รังผึ้งสีทอง — จอครัว</h1>
        <span style={styles.countBadge}>{orders.length} ออเดอร์</span>
      </div>

      {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}

      {loading ? (
        <p style={styles.emptyText}>กำลังโหลดออเดอร์...</p>
      ) : orders.length === 0 ? (
        <p style={styles.emptyText}>ยังไม่มีออเดอร์ที่ต้องจัด</p>
      ) : (
        <div style={styles.grid}>
          {orders.map((order) => {
            const isCooking = order.status === 'cooking';
            const orderItems = Array.isArray(order.items) ? order.items : [];
            return (
              <div
                key={order.id}
                style={{
                  ...styles.card,
                  ...(isCooking ? styles.cardCooking : {}),
                }}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.tableNumber}>โต๊ะ {order.table_number}</span>
                  <span style={styles.orderTime}>{formatTime(order.created_at)}</span>
                </div>

                <ul style={styles.itemList}>
                  {orderItems.map((item, idx) => (
                    <li key={idx} style={styles.itemRow}>
                      <span>{item.name}</span>
                      <span style={styles.itemQty}>x{item.quantity}</span>
                    </li>
                  ))}
                </ul>

                <div style={styles.cardActions}>
                  {!isCooking && (
                    <button type="button" onClick={() => handleStartCooking(order.id)} style={styles.startBtn}>
                      เริ่มจัดสินค้า
                    </button>
                  )}
                  <button type="button" onClick={() => handleServed(order.id)} style={styles.doneBtn}>
                    จัดเสิร์ฟ/เสร็จสิ้น
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: COLORS.bg,
    fontFamily: 'system-ui, -apple-system, "Noto Sans Thai", sans-serif',
    padding: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    color: COLORS.text,
    margin: 0,
  },
  countBadge: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#fff',
    background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
    borderRadius: 999,
    padding: '0.5rem 1.25rem',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: '1.1rem',
    marginBottom: '1rem',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: '1.5rem',
    color: COLORS.subtext,
    marginTop: '3rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.25rem',
  },
  card: {
    background: COLORS.card,
    border: `3px solid ${COLORS.gold}`,
    borderRadius: 20,
    padding: '1.25rem',
    boxShadow: '0 6px 18px rgba(201, 151, 30, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  cardCooking: {
    background: COLORS.cooking,
    border: `3px solid ${COLORS.cookingBorder}`,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  tableNumber: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: COLORS.text,
  },
  orderTime: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: COLORS.subtext,
  },
  itemList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '1.35rem',
    fontWeight: 600,
    color: COLORS.text,
  },
  itemQty: {
    color: COLORS.orange,
    fontWeight: 800,
  },
  cardActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.25rem',
  },
  startBtn: {
    flex: 1,
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#fff',
    background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
    border: 'none',
    borderRadius: 12,
    padding: '0.85rem',
    cursor: 'pointer',
  },
  doneBtn: {
    flex: 1,
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#fff',
    background: '#2E7D32',
    border: 'none',
    borderRadius: 12,
    padding: '0.85rem',
    cursor: 'pointer',
  },
};
