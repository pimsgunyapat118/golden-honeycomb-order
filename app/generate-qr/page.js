'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

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

const initialForm = { tableNumber: '', adultCount: '', childCount: '' };

export default function GenerateQrPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Existing open session found for this table number
  const [existingSession, setExistingSession] = useState(null);

  // Confirm-close dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [closing, setClosing] = useState(false);

  // Successful new session -> QR result
  const [result, setResult] = useState(null);

  // Copy-link feedback
  const [copied, setCopied] = useState(false);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetAll() {
    setForm(initialForm);
    setErrorMsg('');
    setExistingSession(null);
    setShowConfirm(false);
    setClosing(false);
    setResult(null);
    setCopied(false);
  }

  function buildOrderUrl(tableNumber) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/order/${tableNumber}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    const tableNumber = form.tableNumber.trim();
    const adultCount = form.adultCount.trim();
    const childCount = form.childCount.trim();

    if (!tableNumber || adultCount === '' || childCount === '') {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบทั้ง 3 ช่อง');
      return;
    }
    if (Number.isNaN(Number(tableNumber)) || Number.isNaN(Number(adultCount)) || Number.isNaN(Number(childCount))) {
      setErrorMsg('เลขโต๊ะ จำนวนผู้ใหญ่ และจำนวนเด็ก ต้องเป็นตัวเลขเท่านั้น');
      return;
    }

    setLoading(true);
    try {
      const { data: openSessions, error: selectError } = await supabase
        .from('sessions')
        .select('id, table_number, adult_count, child_count, created_at')
        .eq('table_number', Number(tableNumber))
        .eq('status', 'open')
        .limit(1);

      if (selectError) throw selectError;

      if (openSessions && openSessions.length > 0) {
        // Table already has an open session — warn instead of creating a new one
        setExistingSession(openSessions[0]);
        setResult(null);
        setLoading(false);
        return;
      }

      // No open session — create a new one
      const { data: inserted, error: insertError } = await supabase
        .from('sessions')
        .insert({
          table_number: Number(tableNumber),
          adult_count: Number(adultCount),
          child_count: Number(childCount),
          status: 'open',
        })
        .select('id, table_number, adult_count, child_count')
        .single();

      if (insertError) throw insertError;

      setResult({
        tableNumber: inserted.table_number,
        adultCount: inserted.adult_count,
        childCount: inserted.child_count,
        url: buildOrderUrl(inserted.table_number),
      });
      setExistingSession(null);
    } catch (err) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  function minutesSince(createdAt) {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const diffMinutes = Math.max(0, Math.floor((now - created) / 60000));
    return diffMinutes;
  }

  async function handleConfirmClose() {
    if (!existingSession) return;
    setClosing(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', existingSession.id);

      if (error) throw error;

      setShowConfirm(false);
      setExistingSession(null);
    } catch (err) {
      setErrorMsg(err.message || 'ปิดออเดอร์เดิมไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setClosing(false);
    }
  }

  async function handleCopyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setErrorMsg('คัดลอกลิงก์ไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง');
    }
  }

  const qrSrc = result
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(result.url)}`
    : '';

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>🐝 รังผึ้งสีทอง</h1>
        <p style={styles.subtitle}>เปิดโต๊ะ / เปิดออเดอร์ใหม่</p>

        {/* Success: QR result */}
        {result ? (
          <div style={styles.card}>
            <div style={styles.qrWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt={`QR code สำหรับโต๊ะ ${result.tableNumber}`} style={styles.qrImg} />
            </div>
            <p style={styles.summaryText}>
              โต๊ะ {result.tableNumber} · ผู้ใหญ่ {result.adultCount} · เด็ก {result.childCount}
            </p>
            <div style={styles.linkRow}>
              <span style={styles.linkText}>{result.url}</span>
              <button type="button" onClick={handleCopyLink} style={styles.copyBtn}>
                {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์'}
              </button>
            </div>
            <button type="button" onClick={resetAll} style={styles.primaryBtn}>
              เปิดโต๊ะใหม่
            </button>
          </div>
        ) : (
          <div style={styles.card}>
            {/* Warning: existing open session */}
            {existingSession && (
              <div style={styles.warningBox}>
                <p style={styles.warningText}>
                  โต๊ะ/ออเดอร์นี้ยังมีรายการเปิดค้างอยู่ กรุณาปิดออเดอร์เดิมก่อน
                </p>
                <button type="button" onClick={() => setShowConfirm(true)} style={styles.dangerBtn}>
                  ปิดออเดอร์เดิม
                </button>
              </div>
            )}

            {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}

            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>
                เลขโต๊ะ / เลขชุดออเดอร์
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.tableNumber}
                  onChange={(e) => handleChange('tableNumber', e.target.value)}
                  style={styles.input}
                  placeholder="เช่น 1"
                  disabled={loading}
                />
              </label>

              <label style={styles.label}>
                จำนวนผู้ใหญ่
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.adultCount}
                  onChange={(e) => handleChange('adultCount', e.target.value)}
                  style={styles.input}
                  placeholder="เช่น 2"
                  disabled={loading}
                />
              </label>

              <label style={styles.label}>
                จำนวนเด็ก
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.childCount}
                  onChange={(e) => handleChange('childCount', e.target.value)}
                  style={styles.input}
                  placeholder="เช่น 0"
                  disabled={loading}
                />
              </label>

              <button type="submit" style={styles.primaryBtn} disabled={loading}>
                {loading ? 'กำลังดำเนินการ...' : 'เปิดโต๊ะ/เปิดออเดอร์'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Confirm-close dialog */}
      {showConfirm && existingSession && (
        <div style={styles.overlay}>
          <div style={styles.dialog}>
            <h2 style={styles.dialogTitle}>ยืนยันปิดโต๊ะเดิม</h2>
            <div style={styles.dialogBody}>
              <p style={styles.dialogRow}>โต๊ะ {existingSession.table_number}</p>
              <p style={styles.dialogRow}>
                ผู้ใหญ่ {existingSession.adult_count} · เด็ก {existingSession.child_count}
              </p>
              <p style={styles.dialogRow}>เปิดมาแล้ว {minutesSince(existingSession.created_at)} นาที</p>
            </div>
            {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}
            <div style={styles.dialogActions}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                style={styles.secondaryBtn}
                disabled={closing}
              >
                ยกเลิก
              </button>
              <button type="button" onClick={handleConfirmClose} style={styles.dangerBtn} disabled={closing}>
                {closing ? 'กำลังปิด...' : 'ยืนยันปิดโต๊ะเดิม'}
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
    display: 'flex',
    justifyContent: 'center',
    padding: '2rem 1rem',
    fontFamily: 'system-ui, -apple-system, "Noto Sans Thai", sans-serif',
  },
  container: {
    width: '100%',
    maxWidth: 440,
  },
  title: {
    textAlign: 'center',
    fontSize: '2rem',
    color: COLORS.text,
    margin: '0 0 0.25rem',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: '1.1rem',
    color: COLORS.subtext,
    margin: '0 0 1.5rem',
  },
  card: {
    background: COLORS.card,
    borderRadius: 20,
    padding: '1.75rem 1.5rem',
    boxShadow: '0 8px 24px rgba(201, 151, 30, 0.15)',
    border: `1px solid ${COLORS.border}`,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    fontSize: '1.05rem',
    fontWeight: 600,
    color: COLORS.text,
  },
  input: {
    fontSize: '1.3rem',
    padding: '0.65rem 0.8rem',
    borderRadius: 12,
    border: `2px solid ${COLORS.border}`,
    outline: 'none',
    color: COLORS.text,
  },
  primaryBtn: {
    marginTop: '0.5rem',
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#fff',
    background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
    border: 'none',
    borderRadius: 14,
    padding: '0.9rem 1rem',
    cursor: 'pointer',
    width: '100%',
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
  warningBox: {
    background: COLORS.dangerBg,
    border: `1px solid ${COLORS.danger}`,
    borderRadius: 14,
    padding: '1rem',
    marginBottom: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  warningText: {
    color: COLORS.danger,
    fontWeight: 600,
    fontSize: '1.05rem',
    margin: 0,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: '0.95rem',
    marginBottom: '0.75rem',
  },
  qrWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  qrImg: {
    width: 220,
    height: 220,
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
  },
  summaryText: {
    textAlign: 'center',
    fontSize: '1.3rem',
    fontWeight: 700,
    color: COLORS.text,
    margin: '0 0 1rem',
  },
  linkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: '0.6rem 0.75rem',
    marginBottom: '1.25rem',
  },
  linkText: {
    flex: 1,
    fontSize: '0.9rem',
    color: COLORS.subtext,
    wordBreak: 'break-all',
  },
  copyBtn: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: COLORS.text,
    background: '#fff',
    border: `1px solid ${COLORS.gold}`,
    borderRadius: 8,
    padding: '0.4rem 0.6rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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
};
