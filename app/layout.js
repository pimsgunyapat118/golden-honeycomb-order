export const metadata = {
  title: 'รังผึ้งสีทอง',
  description: 'ระบบสั่งซื้อหน้าร้าน รังผึ้งสีทอง',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
