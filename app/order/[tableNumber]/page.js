'use client';

import { use, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function OrderPage({ params }) {
  // แกะ params สำหรับ Next.js 15
  const resolvedParams = use(params);
  const tableNumber = resolvedParams.tableNumber;

  const [session, setSession] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderSent, setOrderSent] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // 1. ดึงข้อมูล session ที่เปิดอยู่
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('table_number', tableNumber)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionData) {
        setSession(sessionData);
      }

      // 2. ดึงหมวดหมู่และเมนู
      const { data: catData } = await supabase.from('menu_categories').select('*').order('id');
      const { data: itemData } = await supabase.from('menu_items').select('*');

      if (catData && catData.length > 0) {
        setCategories(catData);
        setActiveCategory(catData[0].id);
      }
      if (itemData) {
        setMenuItems(itemData);
      }
      setLoading(false);
    }
    fetchData();
  }, [tableNumber]);

  const updateQuantity = (itemId, change) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const updated = current + change;
      if (updated <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: Math.min(updated, 5) };
    });
  };

  const handleSendOrder = async () => {
    if (!session || Object.keys(cart).length === 0) return;

    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = menuItems.find((m) => m.id === parseInt(itemId));
      return { name: item?.name || '', quantity: qty, price: item?.price || 0 };
    });

    const { error } = await supabase.from('orders').insert([
      {
        session_id: session.id,
        table_number: parseInt(tableNumber),
        items: orderItems,
        status: 'received',
      },
    ]);

    if (!error) {
      setCart({});
      setOrderSent(true);
      setTimeout(() => setOrderSent(false), 3000);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูลร้านรังผึ้งสีทอง...</div>;

  if (isClosed) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>🐝 ขอบคุณที่อุดหนุนรังผึ้งสีทอง 🍯</h2>
        <p>เช็คบิลเรียบร้อยแล้ว ยินดีต้อนรับในโอกาสถัดไปครับ</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#d97706' }}>⚠️ โต๊ะ/ออเดอร์นี้ยังไม่เปิดใช้งาน</h2>
        <p>กรุณาติดต่อพนักงานหน้าร้านเพื่อเปิดโต๊ะก่อนสั่งอาหารครับ</p>
      </div>
    );
  }

  const filteredItems = menuItems.filter((i) => i.category_id === activeCategory);
  const totalCartItems = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', paddingBottom: '100px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #fef3c7', paddingBottom: '0.5rem' }}>
        <h2 style={{ margin: 0, color: '#b45309' }}>🐝 รังผึ้งสีทอง (โต๊ะ {tableNumber})</h2>
        <button
          onClick={() => setShowBill(true)}
          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          เรียกเก็บเงิน
        </button>
      </header>

      {orderSent && (
        <div style={{ background: '#dcfce7', color: '#15803d', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
          ✅ ส่งออเดอร์เข้าครัวเรียบร้อยแล้ว!
        </div>
      )}

      {/* Tabs หมวดหมู่ */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '1rem' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              whiteSpace: 'nowrap',
              background: activeCategory === cat.id ? '#f59e0b' : '#fef3c7',
              color: activeCategory === cat.id ? 'white' : '#92400e',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* รายการอาหาร */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {filteredItems.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#78350f' }}>{item.name}</div>
              <div style={{ color: '#d97706', fontSize: '0.9rem' }}>฿{item.price}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {cart[item.id] > 0 && (
                <>
                  <button onClick={() => updateQuantity(item.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#fcd34d', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                  <span style={{ fontWeight: 'bold' }}>{cart[item.id]}</span>
                </>
              )}
              <button onClick={() => updateQuantity(item.id, 1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#f59e0b', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* แถบตะกร้าลอยด้านล่าง */}
      {totalCartItems > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '560px', background: '#b45309', color: 'white', padding: '12px 20px', borderRadius: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <div>เลือกแล้ว <b>{totalCartItems}</b> รายการ</div>
          <button onClick={handleSendOrder} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
            ส่งออเดอร์ ➔
          </button>
        </div>
      )}

      {/* Dialog เช็คบิล */}
      {showBill && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <h3>💰 ยืนยันการเรียกเก็บเงิน</h3>
            <p>ต้องการแจ้งพนักงานเพื่อเช็คบิลโต๊ะ {tableNumber} หรือไม่?</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
              <button onClick={() => setShowBill(false)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff' }}>ยกเลิก</button>
              <button
                onClick={async () => {
                  await supabase.from('sessions').update({ status: 'closed' }).eq('id', session.id);
                  setShowBill(false);
                  setIsClosed(true);
                }}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold' }}
              >
                ยืนยันเช็คบิล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
