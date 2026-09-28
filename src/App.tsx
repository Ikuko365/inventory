import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
//import TestSupabase from './TestSupabase'//

// --- Types ----------------------------------------------------

// ─── Types ───────────────────────────────────────────────────────────────────

type Page =
  | 'top'
  | 'input'
  | 'history'
  | 'admin'
  | 'product-register'
  | 'employee-register'
  | 'edit'
  

interface Product {
  id: number
  name: string
  appropriate: number
  current: number
}

interface Employee {
  id: number
  name: string
  role: string
}

interface HistoryEntry {
  id: number
  productId: number
  productName: string
  type: '入荷' | '出庫' | '修正'
  quantity: number
  date: string
  employeeName: string
  note: string
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

// ─── Supabase → アプリ用の形に変換 ───
const toProduct = (r: any): Product => ({
  id: r.id,
  name: r.name,
  appropriate: r.appropriate_stock,
  current: r.current_stock,
})

const toEmployee = (r: any): Employee => ({
  id: r.id,
  name: r.name,
  role: r.role,
})

const toHistory = (r: any): HistoryEntry => ({
  id: r.id,
  productId: r.product_id,
  productName: r.product_name,
  type: r.type,
  quantity: r.quantity,
  date: r.date,
  employeeName: r.employee_name,
  note: r.note ?? '',
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stockStatus = (p: Product) => {
  const diff = p.current - p.appropriate
  if (p.current <= p.appropriate * 0.3) return 'danger'
  if (p.current < p.appropriate) return 'warning'
  return 'ok'
}

const statusColor = {
  ok: { bg: '#e6f4ec', text: '#3a7d54', label: '適正' },
  warning: { bg: '#fef3e2', text: '#e67e22', label: '不足気味' },
  danger: { bg: '#fdecea', text: '#c0392b', label: '要補充' },
}

// ─── Components ───────────────────────────────────────────────────────────────

const S = {
  // Shared inline-style helpers
  card: {
    background: '#ffffff',
    border: '1px solid #e8ddd0',
    borderRadius: 12,
    padding: 20,
  } as React.CSSProperties,
  btn: (variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary', size: 'sm' | 'md' = 'md') => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: size === 'sm' ? '6px 14px' : '10px 20px',
    borderRadius: 8,
    fontSize: size === 'sm' ? 13 : 14,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    ...(variant === 'primary' ? { background: '#6b4226', color: '#fff' } : {}),
    ...(variant === 'secondary' ? { background: '#f0e8de', color: '#6b4226', border: '1px solid #d4c4b0' } : {}),
    ...(variant === 'danger' ? { background: '#fdecea', color: '#c0392b', border: '1px solid #f5c6c2' } : {}),
    ...(variant === 'ghost' ? { background: 'transparent', color: '#7a5c42', border: '1px solid #e8ddd0' } : {}),
  } as React.CSSProperties),
  input: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #d4c4b0',
    background: '#fdf8f2',
    fontSize: 14,
    color: '#2c1a0e',
    outline: 'none',
  } as React.CSSProperties,
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#7a5c42',
    marginBottom: 4,
    display: 'block',
    letterSpacing: '0.04em',
  } as React.CSSProperties,
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const titles: Partial<Record<Page, string>> = {
    top: 'ダッシュボード',
    input: '入荷 / 出庫 入力',
    history: '履歴一覧',
    admin: '管理者専用',
    'product-register': '商品登録',
    'employee-register': '従業員登録',
    edit: '登録内容の修正',
   
  }
  const showBack = page !== 'top'

  return (
    <header style={{
      background: '#6b4226',
      color: '#fff',
      padding: '0 20px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(107,66,38,0.2)',
    }}>
      {showBack && (
        <button onClick={() => {
          if (page === 'product-register' || page === 'employee-register') setPage('admin')
          else setPage('top')
        }} style={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          color: '#fff',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 13,
          cursor: 'pointer',
        }}>← 戻る</button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <span style={{ fontSize: 20 }}>☕</span>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
          {page === 'top' ? 'カフェ在庫管理' : titles[page]}
        </span>
      </div>
      {page === 'top' && (
        <button onClick={() => setPage('admin')} style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff',
          borderRadius: 6,
          padding: '5px 12px',
          fontSize: 12,
          cursor: 'pointer',
          fontWeight: 600,
        }}>管理者</button>
      )}
    </header>
  )
}

// ─── Top Page ─────────────────────────────────────────────────────────────────

function TopPage({ products, setPage, setEditTarget }: {
  products: Product[]
  setPage: (p: Page) => void
  setEditTarget: (id: number | null) => void
}) {
  const dangerCount = products.filter(p => stockStatus(p) === 'danger').length
  const warningCount = products.filter(p => stockStatus(p) === 'warning').length

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      {/* Alert bar */}
      {(dangerCount > 0 || warningCount > 0) && (
        <div style={{
          background: '#fdecea', border: '1px solid #f5c6c2',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ fontSize: 13, color: '#c0392b' }}>
            {dangerCount > 0 && <span style={{ fontWeight: 700 }}>要補充 {dangerCount}品目</span>}
            {dangerCount > 0 && warningCount > 0 && <span style={{ color: '#b09070' }}> / </span>}
            {warningCount > 0 && <span style={{ color: '#e67e22' }}>不足気味 {warningCount}品目</span>}
            があります
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button style={S.btn('primary')} onClick={() => setPage('input')}>＋ 入荷 / 出庫 入力</button>
        <button style={S.btn('ghost')} onClick={() => setPage('history')}>📋 履歴一覧</button>
      </div>

      {/* Inventory table — fixed layout, no horizontal scroll */}
      <div style={S.card}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#2c1a0e' }}>商品別 在庫一覧</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '40%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '2px solid #e8ddd0' }}>
              {['品名', '適正', '現在', '差分', '状態', ''].map(h => (
                <th key={h} style={{ padding: '6px 6px', textAlign: h === '品名' ? 'left' : 'center', color: '#7a5c42', fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const st = stockStatus(p)
              const diff = p.current - p.appropriate
              const sc = statusColor[st]
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0e8de' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fef8f4')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '9px 6px', fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={p.name}>{p.name}</td>
                  <td style={{ padding: '9px 6px', color: '#7a5c42', fontSize: 13, textAlign: 'center' }}>{p.appropriate}</td>
                  <td style={{ padding: '9px 6px', fontWeight: 700, fontSize: 13, textAlign: 'center', color: st === 'danger' ? '#c0392b' : st === 'warning' ? '#e67e22' : '#2c1a0e' }}>{p.current}</td>
                  <td style={{ padding: '9px 6px', textAlign: 'center', color: diff < 0 ? '#c0392b' : '#3a7d54', fontWeight: 600, fontSize: 13 }}>
                    {diff >= 0 ? `+${diff}` : diff}
                  </td>
                  <td style={{ padding: '9px 4px', textAlign: 'center' }}>
                    <span style={{ background: sc.bg, color: sc.text, padding: '2px 5px', borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {sc.label}
                    </span>
                  </td>
                  <td style={{ padding: '9px 4px', textAlign: 'center' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                      title="修正" onClick={() => { setEditTarget(p.id); setPage('edit') }}>✏️</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Input Page ───────────────────────────────────────────────────────────────

function InputPage({ products, employees, addHistory, setPage }: {
  products: Product[]
  employees: Employee[]
  addHistory: (e: Omit<HistoryEntry, 'id'>) => void
  setPage: (p: Page) => void
}) {
  const [type, setType] = useState<'入荷' | '出庫'>('入荷')
  const [productId, setProductId] = useState(products[0]?.id ?? 1)
  const [quantity, setQuantity] = useState('')
  const [employeeName, setEmployeeName] = useState(employees[0]?.name ?? '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const selectedProduct = products.find(p => p.id === productId)

  const handleSubmit = () => {
    if (!quantity || !employeeName || !date) return
    const q = parseInt(quantity)
    if (isNaN(q) || q <= 0) return
    addHistory({
      productId,
      productName: selectedProduct?.name ?? '',
      type,
      quantity: q,
      date,
      employeeName,
      note,
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>登録完了</h2>
        <p style={{ color: '#7a5c42', marginBottom: 24, fontSize: 14 }}>
          {selectedProduct?.name} の {type}（{quantity}）を登録しました
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button style={S.btn('primary')} onClick={() => { setSubmitted(false); setQuantity(''); setNote('') }}>続けて入力</button>
          <button style={S.btn('ghost')} onClick={() => setPage('top')}>トップへ戻る</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['入荷', '出庫'] as const).map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: 'none',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
              background: type === t ? (t === '入荷' ? '#6b4226' : '#c0392b') : '#f0e8de',
              color: type === t ? '#fff' : '#7a5c42',
            }}>{t}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={S.label}>品名</label>
            <select style={S.input} value={productId} onChange={e => setProductId(Number(e.target.value))}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {selectedProduct && (
            <div style={{ background: '#fef4ea', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#7a5c42' }}>
              現在庫: <strong style={{ color: '#2c1a0e' }}>{selectedProduct.current}</strong> ／ 適正: {selectedProduct.appropriate}
            </div>
          )}

          <div>
            <label style={S.label}>{type}数量</label>
            <input style={S.input} type="number" min="1" placeholder="数量を入力"
              value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>

          <div>
            <label style={S.label}>入力者</label>
            <select style={S.input} value={employeeName} onChange={e => setEmployeeName(e.target.value)}>
              {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
            </select>
          </div>

          <div>
            <label style={S.label}>日付</label>
            <input style={S.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div>
            <label style={S.label}>備考（任意）</label>
            <textarea style={{ ...S.input, resize: 'vertical', minHeight: 72 }}
              placeholder="メモがあれば入力"
              value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <button style={{ ...S.btn('primary'), width: '100%', padding: '12px' }} onClick={handleSubmit}>
            登録する
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── History Page ─────────────────────────────────────────────────────────────

function HistoryPage({ history, setPage }: {
  history: HistoryEntry[]
  setPage: (p: Page) => void
}) {
  const [filterType, setFilterType] = useState<'全て' | '入荷' | '出庫' | '修正'>('全て')
  const [filterProduct, setFilterProduct] = useState('')

  const productNames = [...new Set(history.map(h => h.productName))]
  const filtered = history
    .filter(h => filterType === '全て' || h.type === filterType)
    .filter(h => !filterProduct || h.productName === filterProduct)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['全て', '入荷', '出庫', '修正'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
              background: filterType === t ? '#6b4226' : '#f0e8de',
              color: filterType === t ? '#fff' : '#7a5c42',
            }}>{t}</button>
          ))}
        </div>
        <select style={{ ...S.input, width: 'auto', flex: 1, minWidth: 160 }}
          value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
          <option value="">すべての商品</option>
          {productNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Card list — no horizontal scroll, names never wrap */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', color: '#b09070', padding: 32 }}>該当する履歴がありません</div>
        ) : filtered.map(h => (
          <div key={h.id} style={{
            background: '#ffffff',
            border: '1px solid #e8ddd0',
            borderRadius: 10, padding: '11px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {/* type badge */}
            <span style={{
              flexShrink: 0, padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              background: h.type === '入荷' ? '#e6f4ec' : '#fdecea',
              color: h.type === '入荷' ? '#3a7d54' : '#c0392b',
            }}>{h.type}</span>
            {/* product name — truncate */}
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
              title={h.productName}>{h.productName}</span>
            {/* quantity */}
            <span style={{ flexShrink: 0, fontSize: 14, fontWeight: 700, color: h.type === '入荷' ? '#3a7d54' : '#c0392b', minWidth: 28, textAlign: 'right' }}>
              {h.type === '修正' ? (h.quantity > 0 ? '+' : '') : h.type === '入荷' ? '+' : '-'}{h.quantity}
            </span>
            {/* right meta */}
            <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 72 }}>
              <div style={{ fontSize: 11, color: '#7a5c42' }}>{h.date}</div>
              <div style={{ fontSize: 11, color: '#b09070', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 72 }}>{h.employeeName}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

function AdminPage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ ...S.card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#7a5c42', marginBottom: 16 }}>マスタ管理</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{ ...S.btn('primary'), width: '100%', padding: '14px', fontSize: 15 }}
            onClick={() => setPage('product-register')}>
            📦 商品 / 在庫の登録・編集
          </button>
          <button style={{ ...S.btn('secondary'), width: '100%', padding: '14px', fontSize: 15 }}
            onClick={() => setPage('employee-register')}>
            👤 従業員の登録・編集
          </button>
        </div>
      </div>
      <div style={{ ...S.card, fontSize: 13, color: '#7a5c42' }}>
        <p>⚠️ このページはマネージャー以上の権限が必要です。変更内容は全スタッフに即時反映されます。</p>
      </div>
    </div>
  )
}

// ─── Product Register Page ────────────────────────────────────────────────────

function ProductRegisterPage({ products, addProduct, updateProduct }: {
  products: Product[]
  addProduct: (p: Omit<Product, 'id'>) => void
  updateProduct: (id: number, p: Partial<Product>) => void
}) {
  const [name, setName] = useState('')
  const [appropriate, setAppropriate] = useState('')
  const [current, setCurrent] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  const startEdit = (p: Product) => {
    setEditId(p.id); setName(p.name); setAppropriate(String(p.appropriate)); setCurrent(String(p.current))
  }
  const handleSave = () => {
    if (!name || !appropriate || !current) return
    if (editId) {
      updateProduct(editId, { name, appropriate: Number(appropriate), current: Number(current) })
    } else {
      addProduct({ name, appropriate: Number(appropriate), current: Number(current) })
    }
    setName(''); setAppropriate(''); setCurrent(''); setEditId(null)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <div style={{ ...S.card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{editId ? '商品を編集' : '新しい商品を登録'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={S.label}>商品名</label>
            <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="例: コーヒー豆（ブレンド）" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={S.label}>適正在庫</label>
              <input style={S.input} type="number" min="0" value={appropriate} onChange={e => setAppropriate(e.target.value)} /></div>
            <div><label style={S.label}>現在庫</label>
              <input style={S.input} type="number" min="0" value={current} onChange={e => setCurrent(e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...S.btn('primary'), flex: 1, padding: '11px' }} onClick={handleSave}>
              {editId ? '変更を保存' : '登録する'}
            </button>
            {editId && <button style={S.btn('ghost')} onClick={() => { setEditId(null); setName(''); setAppropriate(''); setCurrent('') }}>キャンセル</button>}
          </div>
          {saved && <div style={{ color: '#3a7d54', fontSize: 13, textAlign: 'center' }}>✓ 保存しました</div>}
        </div>
      </div>
      <div style={S.card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>登録済み商品一覧</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: editId === p.id ? '#fef4ea' : '#fdf8f2', borderRadius: 8, border: '1px solid #f0e8de' }}>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{p.name}</span>
              <span style={{ fontSize: 12, color: '#b09070' }}>適正 {p.appropriate} / 現在 {p.current}</span>
              <button style={S.btn('ghost', 'sm')} onClick={() => startEdit(p)}>編集</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Employee Register Page ───────────────────────────────────────────────────

function EmployeeRegisterPage({ employees, addEmployee }: {
  employees: Employee[]
  addEmployee: (e: Omit<Employee, 'id'>) => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('スタッフ')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (!name) return
    addEmployee({ name, role })
    setName(''); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ ...S.card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>従業員を追加</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={S.label}>氏名</label>
            <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="例: 田中 花子" /></div>
          <div><label style={S.label}>役割</label>
            <select style={S.input} value={role} onChange={e => setRole(e.target.value)}>
              <option>マネージャー</option>
              <option>スタッフ</option>
            </select></div>
          <button style={{ ...S.btn('primary'), padding: '11px' }} onClick={handleSave}>登録する</button>
          {saved && <div style={{ color: '#3a7d54', fontSize: 13, textAlign: 'center' }}>✓ 保存しました</div>}
        </div>
      </div>
      <div style={S.card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>従業員一覧</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {employees.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fdf8f2', borderRadius: 8, border: '1px solid #f0e8de' }}>
              <span style={{ fontSize: 18 }}>👤</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{e.name}</span>
              <span style={{ fontSize: 12, background: e.role === 'マネージャー' ? '#fef3e2' : '#f0e8de', color: e.role === 'マネージャー' ? '#e67e22' : '#7a5c42', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>{e.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Edit Page ────────────────────────────────────────────────────────────────

function EditPage({
  products,
  employees,
  editTargetId,
  setPage,
  correctStock,
}: {
  products: Product[]
  employees: Employee[]
  editTargetId: number | null
  setPage: (p: Page) => void
  correctStock: (
    id: number,
    p: { appropriate: number; current: number },
    employeeName: string,
    note: string
  ) => Promise<void>
}) {
  const target = products.find(p => p.id === editTargetId)
  const [appropriate, setAppropriate] = useState(String(target?.appropriate ?? ''))
  const [current, setCurrent] = useState(String(target?.current ?? ''))
  const [employeeName, setEmployeeName] = useState(employees[0]?.name ?? '')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  if (!target) return <div style={{ padding: 20 }}>商品が見つかりません</div>

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
      <div style={S.card}>
        <div style={{ background: '#fef4ea', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#7a5c42', marginBottom: 2 }}>対象商品</p>
          <p style={{ fontSize: 16, fontWeight: 700 }}>{target.name}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={S.label}>適正在庫</label>
              <input style={S.input} type="number" min="0" value={appropriate} onChange={e => setAppropriate(e.target.value)} /></div>
            <div><label style={S.label}>現在庫</label>
              <input style={S.input} type="number" min="0" value={current} onChange={e => setCurrent(e.target.value)} /></div>
          </div>
            <div><label style={S.label}>担当者</label>
            <select style={S.input} value={employeeName} onChange={e => setEmployeeName(e.target.value)}>
              {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
            </select></div>
          <div><label style={S.label}>修正理由・備考</label>
            <textarea style={{ ...S.input, resize: 'vertical', minHeight: 80 }}
              value={note} onChange={e => setNote(e.target.value)} placeholder="理由があれば記入" /></div>

          {saved ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <p style={{ color: '#3a7d54', fontWeight: 600 }}>変更を保存しました</p>
              <button style={{ ...S.btn('ghost'), marginTop: 12 }} onClick={() => setPage('top')}>トップへ戻る</button>
            </div>
          ) : (
                        <button
              style={{ ...S.btn('primary'), padding: '12px' }}
              onClick={async () => {
                await correctStock(
                  target.id,
                  { appropriate: Number(appropriate), current: Number(current) },
                  employeeName,
                  note
                )
                setSaved(true)
              }}
            >
              変更を保存する
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── History Confirm Page ─────────────────────────────────────────────────────


// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const tabs = [
    { id: 'top' as Page, icon: '🏠', label: '在庫' },
    { id: 'input' as Page, icon: '➕', label: '入出庫' },
    { id: 'history' as Page, icon: '📋', label: '履歴' },
    { id: 'admin' as Page, icon: '⚙️', label: '管理' },
  ]
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#fff', borderTop: '1px solid #e8ddd0',
      display: 'flex', height: 60, zIndex: 100,
      boxShadow: '0 -2px 10px rgba(107,66,38,0.08)',
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 3, border: 'none',
          background: 'transparent', cursor: 'pointer',
          color: page === t.id ? '#6b4226' : '#b09070',
          borderTop: `2px solid ${page === t.id ? '#6b4226' : 'transparent'}`,
        }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontSize: 11, fontWeight: page === t.id ? 700 : 400 }}>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>('top')
  const [products, setProducts] = useState<Product[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editTargetId, setEditTargetId] = useState<number | null>(null)


  // Supabaseから全データを読み込む
  const loadAll = async () => {
    const [p, e, h] = await Promise.all([
      supabase.from('products').select('*').order('id'),
      supabase.from('employees').select('*').order('id'),
      supabase
        .from('history')
        .select('*')
        .order('date', { ascending: false })
        .order('id', { ascending: false }),
    ])
    if (p.error || e.error || h.error) {
      console.error(p.error, e.error, h.error)
      alert('データの読み込みに失敗しました')
      setLoading(false)
      return
    }
    setProducts((p.data ?? []).map(toProduct))
    setEmployees((e.data ?? []).map(toEmployee))
    setHistory((h.data ?? []).map(toHistory))
    setLoading(false)
  }

  // アプリを開いたときに1回だけ読み込む
  useEffect(() => { loadAll() }, [])

  // 入荷/出庫を登録（履歴を追加 → 現在庫を更新）
  const addHistory = async (e: Omit<HistoryEntry, 'id'>) => {
    const target = products.find(p => p.id === e.productId)
    if (!target) return
    const newCurrent = e.type === '入荷'
      ? target.current + e.quantity
      : Math.max(0, target.current - e.quantity)
  
    const { error: hErr } = await supabase.from('history').insert({
      product_id: e.productId,
      product_name: e.productName,
      type: e.type,
      quantity: e.quantity,
      date: e.date,
      employee_name: e.employeeName,
      note: e.note,
    })
    if (hErr) { alert('履歴の保存に失敗: ' + hErr.message); return }

    const { error: pErr } = await supabase
      .from('products')
      .update({ current_stock: newCurrent })
      .eq('id', e.productId)
    if (pErr) { alert('在庫の更新に失敗: ' + pErr.message); return }

    await loadAll()
  }

  const addProduct = async (p: Omit<Product, 'id'>) => {
    const { error } = await supabase.from('products').insert({
      name: p.name,
      appropriate_stock: p.appropriate,
      current_stock: p.current,
    })
    if (error) { alert('商品の登録に失敗: ' + error.message); return }
    await loadAll()
  }

    // 在庫の修正（修正画面）→ ①履歴に記録 → ②在庫数を更新、の2段階で行う
  const correctStock = async (
    id: number,
    newValues: { appropriate: number; current: number },
    employeeName: string,
    note: string
  ) => {
    const target = products.find(p => p.id === id)
    if (!target) return

    // 変更前と変更後の差分を計算する（増えたら+、減ったら-）
    const diff = newValues.current - target.current
    
    // ① まず history テーブルに「修正」として1行追加する
    const { error: hErr } = await supabase.from('history').insert({
      product_id: id,
      product_name: target.name,
      type: '修正',
      quantity: diff,
      date: new Date().toISOString().slice(0, 10),
      employee_name: employeeName,
      note: note,
    })
    if (hErr) { alert('履歴の保存に失敗: ' + hErr.message); return }

    // ② そのあと products テーブルの数値を更新する
    const { error: pErr } = await supabase
      .from('products')
      .update({
        appropriate_stock: newValues.appropriate,
        current_stock: newValues.current,
      })
      .eq('id', id)
    if (pErr) { alert('在庫の更新に失敗: ' + pErr.message); return }

    await loadAll()
  }
  const updateProduct = async (id: number, p: Partial<Product>) => {
    const patch: Record<string, unknown> = {}
    if (p.name !== undefined) patch.name = p.name
    if (p.appropriate !== undefined) patch.appropriate_stock = p.appropriate
    if (p.current !== undefined) patch.current_stock = p.current
    const { error } = await supabase.from('products').update(patch).eq('id', id)
    if (error) { alert('商品の更新に失敗: ' + error.message); return }
    await loadAll()
  }

    const addEmployee = async (e: Omit<Employee, 'id'>) => {
    const { error } = await supabase.from('employees').insert({
      name: e.name,
      role: e.role,
    })
    if (error) { alert('従業員の登録に失敗: ' + error.message); return }
    await loadAll()
  }
 
  const showBottomNav = ['top', 'input', 'history', 'admin'].includes(page)

  return (
    <div style={{ minHeight: '100vh', background: '#fdf8f2', maxWidth: 600, margin: '0 auto', position: 'relative' }}>
      
      <Header page={page} setPage={setPage} />
<main style={{ paddingBottom: showBottomNav ? 72 : 24 }}>
  {loading ? (
    <p style={{ padding: 20, textAlign: 'center', color: '#7a5c42' }}>
      読み込み中…
    </p>
  ) : (
    <>
      {page === 'top' && (
        <TopPage
          products={products}
          setPage={setPage}
          setEditTarget={setEditTargetId}
        />
      )}
      {page === 'input' && (
        <InputPage
          products={products}
          employees={employees}
          addHistory={addHistory}
          setPage={setPage}
        />
      )}
      {page === 'history' && (
        <HistoryPage
          history={history}
          setPage={setPage}
  />
)}
      
      {page === 'admin' && <AdminPage setPage={setPage} />}
      {page === 'product-register' && (
        <ProductRegisterPage
          products={products}
          addProduct={addProduct}
          updateProduct={updateProduct}
        />
      )}
      {page === 'employee-register' && (
        <EmployeeRegisterPage
          employees={employees}
          addEmployee={addEmployee}
        />
      )}
      {page === 'edit' && (
        <EditPage
          products={products}
          employees={employees}
          editTargetId={editTargetId}
          setPage={setPage}
          correctStock={correctStock}
        />
      )}
      
    </>
  )}
</main>
      {showBottomNav && <BottomNav page={page} setPage={setPage} />}
    </div>
  )
}
