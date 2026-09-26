'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // 1. โหลดออเดอร์เริ่มต้น
    async function fetchOrders() {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['received', 'cooking'])
        .order('created_at', { ascending: true });

      if (data) setOrders(data);
    }

    fetchOrders();

    // 2. เปิดรับข้อมูล Realtime
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (newStatus === 'served') {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    }
  };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif', background: '#fefce8', minHeight: '100vh' }}>
      <h1 style={{ color: '#78350f', borderBottom: '3px solid #f59e0b', paddingBottom: '0.5rem', marginTop: 0 }}>
        🍳 จอครัว / จัดสินค้า - รังผึ้งสีทอง
      </h1>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#a16207', fontSize: '1.2rem' }}>
          ยังไม่มีออเดอร์ใหม่เข้ามาขณะนี้...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: order.status === 'cooking' ? '#fef3c7' : 'white',
                border: order.status === 'cooking' ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#b45309' }}>
                  โต๊ะ {order.table_number}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                {Array.isArray(order.items) &&
                  order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '1.05rem', fontWeight: '500' }}>
                      <span>{item.name}</span>
                      <span style={{ color: '#b45309', fontWeight: 'bold' }}>x{item.quantity}</span>
                    </div>
                  ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {order.status === 'received' && (
                  <button
                    onClick={() => updateStatus(order.id, 'cooking')}
                    style={{ flex: 1, padding: '8px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    👨‍🍳 เริ่มจัดสินค้า
                  </button>
                )}
                <button
                  onClick={() => updateStatus(order.id, 'served')}
                  style={{ flex: 1, padding: '8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ✅ จัดเสิร์ฟแล้ว
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
