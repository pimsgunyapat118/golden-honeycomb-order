# รังผึ้งสีทอง

ระบบสั่งซื้อหน้าร้าน "รังผึ้งสีทอง" — Next.js (App Router, JavaScript) +
Supabase, deploy บน Vercel

> ดูบันทึกทางเทคนิคเพิ่มเติม (โครงสร้างฐานข้อมูล, กฎเรื่อง Dynamic Route
> params) ได้ที่ [`CLAUDE.md`](./CLAUDE.md)

## เริ่มต้นใช้งาน

```bash
npm install
cp .env.local.example .env.local
# แก้ .env.local ให้ใส่ค่า Supabase URL และ anon key ของจริง
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` — รันเซิร์ฟเวอร์สำหรับพัฒนา
- `npm run build` — build สำหรับ production
- `npm run start` — รัน production server (ต้อง build ก่อน)

## Deploy บน Vercel

1. Push โค้ดขึ้น GitHub
2. Import repo เข้า Vercel
3. ตั้งค่า Environment Variables ใน Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy
