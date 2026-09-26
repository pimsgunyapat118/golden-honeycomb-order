import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>รังผึ้งสีทอง</h1>
      <p>ระบบสั่งซื้อหน้าร้าน — หน้านี้ใช้สำหรับทดสอบว่า deploy สำเร็จ</p>
      <ul>
        <li>
          <Link href="/generate-qr">ไปหน้า /generate-qr</Link>
        </li>
        <li>
          <Link href="/kitchen">ไปหน้า /kitchen</Link>
        </li>
      </ul>
    </main>
  );
}
