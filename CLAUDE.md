# รังผึ้งสีทอง — บันทึกสำหรับ AI/ผู้พัฒนา

โปรเจกต์: ระบบสั่งซื้อหน้าร้าน "รังผึ้งสีทอง"
Stack: Next.js (App Router, JavaScript) + Supabase, deploy บน Vercel

## ⚠️ กฎสำคัญ: Dynamic Route params เป็น Promise

โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด ซึ่ง `params` (และ `searchParams`) ใน
Dynamic Route เป็น **Promise** แล้ว ไม่ใช่ object ธรรมดาอีกต่อไป

**ห้าม** เข้าถึง `params.xxx` ตรง ๆ ใน Server Component หรือ Client Component
ต้อง unwrap ด้วย `use()` จาก `react` เสมอ

ตัวอย่างที่ถูกต้อง (Client Component):

```jsx
'use client';
import { use } from 'react';

export default function Page({ params }) {
  const { tableId } = use(params);
  return <div>โต๊ะ {tableId}</div>;
}
```

ตัวอย่างที่ถูกต้อง (Server Component, async):

```jsx
export default async function Page({ params }) {
  const { tableId } = await params;
  return <div>โต๊ะ {tableId}</div>;
}
```

กฎนี้ใช้กับทุก Dynamic Route ที่จะสร้างในโปรเจกต์นี้ต่อจากนี้ (เช่น
`/order/[tableId]`, `/kitchen/[orderId]` ฯลฯ)

## โครงสร้างฐานข้อมูล Supabase (มีอยู่แล้ว — ใช้อ้างอิงเท่านั้น ห้ามสร้างใหม่)

### `sessions`
| column       | type      |
|--------------|-----------|
| id           | —         |
| table_number | —         |
| adult_count  | —         |
| child_count  | —         |
| status       | —         |
| created_at   | —         |

### `menu_categories`
| column     | type |
|------------|------|
| id         | —    |
| name       | —    |
| sort_order | —    |

### `menu_items`
| column      | type |
|-------------|------|
| id          | —    |
| category_id | —    |
| name        | —    |

### `orders`
| column       | type  |
|--------------|-------|
| id           | —     |
| session_id   | —     |
| table_number | —     |
| items        | jsonb |
| status       | —     |
| created_at   | —     |

เวลาเขียน query หรือ insert/update ให้อ้างอิงชื่อคอลัมน์เหล่านี้เท่านั้น
ห้ามสร้างตารางใหม่หรือเปลี่ยนชื่อคอลัมน์โดยไม่ได้รับการยืนยันจากผู้ใช้ก่อน

## Environment Variables

ตั้งค่าใน `.env.local` (ดู `.env.local.example`) และใน Vercel Project Settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase Client

ใช้ client ที่สร้างไว้แล้วที่ `lib/supabaseClient.js`:

```js
import { supabase } from '@/lib/supabaseClient';
```

## หน้าเพจปัจจุบัน (สำหรับทดสอบ deploy)

- `/` — หน้าแรก แสดงชื่อร้านและลิงก์ทดสอบ
- `/generate-qr` — placeholder สำหรับสร้าง QR code ต่อโต๊ะ
- `/kitchen` — placeholder สำหรับหน้าจอออเดอร์ครัว

## Deploy

Push ขึ้น GitHub แล้วเชื่อมต่อ repo กับ Vercel โดยตั้งค่า environment
variables สองตัวข้างต้นใน Vercel Project Settings → Environment Variables
