'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GenerateQRPage() {
  const [tableCount, setTableCount] = useState(10);
  const [generatedTables, setGeneratedTables] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const tables = Array.from({ length: tableCount }, (_, i) => i + 1);
    
    // สร้าง/อัปเดต session ใน Supabase
    for (const tableNum of tables) {
      await supabase
        .from('sessions')
        .upsert([{ table_number: tableNum, status: 'open' }], { onConflict: 'table_number' });
    }

    setGeneratedTables(tables);
    setLoading(false);
  };

  const getOrigin = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#b45309', borderBottom: '2px solid #fcd34d', paddingBottom: '0.5rem' }}>
        🐝 ระบบสร้าง QR Code สั่งอาหาร (รังผึ้งสีทอง)
      </h1>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', margin: '1.5rem 0' }}>
        <label style={{ fontWeight: 'bold' }}>จำนวนโต๊ะทั้งหมด:</label>
        <input
          type="number"
          value={tableCount}
          onChange={(e) => setTableCount(Math.max(1, parseInt(e.target.value) || 1))}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '80px' }}
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {loading ? 'กำลังสร้าง...' : 'สร้าง QR Code ทั้งหมด'}
        </button>
      </div>

      {generatedTables.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
          {generatedTables.map((tableNum) => {
            const orderUrl = `${getOrigin()}/order/${tableNum}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(orderUrl)}`;

            return (
              <div key={tableNum} style={{ border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem', textAlign: 'center', background: '#fffbeb' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#b45309' }}>โต๊ะ {tableNum}</h3>
                <img src={qrUrl} alt={`QR โต๊ะ ${tableNum}`} style={{ width: '150px', height: '150px' }} />
                <div style={{ marginTop: '10px' }}>
                  <a href={orderUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#d97706', textDecoration: 'none', fontWeight: 'bold' }}>
                    ทดลองเปิดหน้าสั่งซื้อ ➔
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
