'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: '3rem 1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#b45309', fontSize: '2rem' }}>🐝 ระบบสั่งอาหาร รังผึ้งสีทอง</h1>
      <p style={{ color: '#78350f', marginBottom: '2rem' }}>ยินดีต้อนรับสู่ระบบสั่งอาหารและบริการจัดการหน้าร้าน</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Link 
          href="/generate-qr" 
          style={{ padding: '12px 20px', background: '#f59e0b', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}
        >
          📱 หน้าสร้าง QR Code สำหรับโต๊ะ
        </Link>
        <Link 
          href="/kitchen" 
          style={{ padding: '12px 20px', background: '#b45309', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}
        >
          🍳 จอจัดการออเดอร์ในครัว
        </Link>
      </div>
    </div>
  );
}
