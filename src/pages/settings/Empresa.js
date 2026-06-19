import { useState, useMemo, useRef } from 'react'
import { Building2, Plus, Pencil, Trash2, X, Check, MapPin, Star, Upload, ImageOff } from 'lucide-react'
import { useLocalState } from '../../hooks/useLocalState'
import { MOCK_COMPANIES, COMPANIES_STORAGE_KEY } from '../../data/mockCompanies'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../../components/ui'
import { useBranches } from '../../hooks/useBranches'

// ─── Formulário de Unidade ─────────────────────────────────────────────────────
const UNIT_EMPTY = {
  name: '',
  custom_fields: {
    cnpj: '', cnae: '', cep: '', logradouro: '', cidade: '', uf: '',
    email: '', telefone: '', responsavel: '', is_matriz: false,
  },
}

function Label({ children, required }) {
  return (
    <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
      {children}{required && <span style={{ color:'#ef4444', marginLeft:2 }}>*</span>}
    </label>
  )
}

function LogoUpload({ value, onChange }) {
  const inputRef = useRef()

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { alert('Imagem deve ter no máximo 500 KB'); return }
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div
        onClick={() => inputRef.current?.click()}
        style={{ width:72, height:72, borderRadius:10, border:`2px dashed var(--border)`, background:'var(--surface)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, transition:'border-color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        {value
          ? <img src={value} alt="logo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
          : <Upload size={20} style={{ color:'var(--text-muted)' }} />}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        <button type="button" onClick={() => inputRef.current?.click()}
          style={{ padding:'5px 12px', borderRadius:7, border:'1px solid var(--border)', background:'none', color:'var(--text)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          {value ? 'Trocar imagem' : 'Selecionar imagem'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')}
            style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'none', color:'#ef4444', fontSize:12, fontWeight:600, cursor:'pointer', textAlign:'left' }}>
            Remover
          </button>
        )}
        <span style={{ fontSize:10, color:'var(--text-muted)' }}>PNG, JPG ou SVG · máx 500 KB</span>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />
    </div>
  )
}

function UnitForm({ value, onChange, onSave, onCancel, saving, isFirst }) {
  const cf = value.custom_fields || {}
  const set = (k, v) => onChange({ ...value, [k]: v })
  const setCf = (k, v) => onChange({ ...value, custom_fields: { ...cf, [k]: v } })

  return (
    <div style={{ padding:'20px', borderTop:'1px solid var(--border)', background:'var(--surface2)', display:'flex', flexDirection:'column', gap:16 }}>
      {/* Logotipo */}
      <div>
        <Label>Logotipo da Unidade</Label>
        <div style={{ marginTop:8 }}>
          <LogoUpload value={cf.logo || ''} onChange={v => setCf('logo', v)} />
        </div>
      </div>

      {/* Nome e Responsável */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <Label required>Nome da Unidade</Label>
          <input className="fpe-field" style={{ marginTop:4 }} value={value.name || ''}
            onChange={e => set('name', e.target.value)}
            placeholder={isFirst ? 'Ex: Matriz — NG Informática SP' : 'Ex: Filial Campinas'} autoFocus />
        </div>
        <div>
          <Label>CNPJ</Label>
          <input className="fpe-field" style={{ marginTop:4, fontFamily:'var(--mono)' }} value={cf.cnpj || ''}
            onChange={e => setCf('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
        </div>
        <div>
          <Label>CNAE</Label>
          <input className="fpe-field" style={{ marginTop:4, fontFamily:'var(--mono)' }} value={cf.cnae || ''}
            onChange={e => setCf('cnae', e.target.value)} placeholder="6202-3/00" />
        </div>
        <div>
          <Label>Responsável</Label>
          <input className="fpe-field" style={{ marginTop:4 }} value={cf.responsavel || ''}
            onChange={e => setCf('responsavel', e.target.value)} placeholder="Nome do responsável" />
        </div>
        <div>
          <Label>Telefone</Label>
          <input className="fpe-field" style={{ marginTop:4, fontFamily:'var(--mono)' }} value={cf.telefone || ''}
            onChange={e => setCf('telefone', e.target.value)} placeholder="(11) 0000-0000" />
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <Label>E-mail</Label>
          <input className="fpe-field" style={{ marginTop:4 }} type="email" value={cf.email || ''}
            onChange={e => setCf('email', e.target.value)} placeholder="contato@empresa.com.br" />
        </div>
      </div>

      {/* Endereço */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <MapPin size={12} style={{ color:'var(--text-muted)' }} />
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Endereço</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <Label>CEP</Label>
            <input className="fpe-field" style={{ marginTop:4, fontFamily:'var(--mono)' }} value={cf.cep || ''}
              onChange={e => setCf('cep', e.target.value)} placeholder="00000-000" />
          </div>
          <div>
            <Label>Cidade</Label>
            <input className="fpe-field" style={{ marginTop:4 }} value={cf.cidade || ''}
              onChange={e => setCf('cidade', e.target.value)} placeholder="São Paulo" />
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <Label>Logradouro</Label>
            <input className="fpe-field" style={{ marginTop:4 }} value={cf.logradouro || ''}
              onChange={e => setCf('logradouro', e.target.value)} placeholder="Av. Paulista, 1374 — Sala 101" />
          </div>
          <div>
            <Label>UF</Label>
            <input className="fpe-field" style={{ marginTop:4, fontFamily:'var(--mono)' }} maxLength={2} value={cf.uf || ''}
              onChange={e => setCf('uf', e.target.value.toUpperCase())} placeholder="SP" />
          </div>
        </div>
      </div>

      {/* É Matriz? */}
      <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', userSelect:'none', fontSize:13, color:'var(--text)' }}>
        <input type="checkbox" checked={!!cf.is_matriz} onChange={e => setCf('is_matriz', e.target.checked)}
          style={{ width:14, height:14, cursor:'pointer', accentColor:'var(--accent)' }} />
        Esta unidade é a Matriz (branch padrão do sistema)
      </label>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, borderTop:'1px solid var(--border)', paddingTop:12 }}>
        <button onClick={onCancel} style={{ padding:'7px 14px', borderRadius:7, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
          <X size={13} /> Cancelar
        </button>
        <button onClick={onSave} disabled={!value.name?.trim() || saving}
          style={{ padding:'7px 14px', borderRadius:7, border:'none', background:'var(--accent)', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, opacity:(!value.name?.trim() || saving) ? 0.5 : 1 }}>
          <Check size={13} /> {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

function UnitRow({ branch, onEdit, onDelete }) {
  const cf = branch.custom_fields || {}
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderTop:'1px solid var(--border)' }}>
      <div style={{ width:44, height:44, borderRadius:9, background:'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative', overflow:'hidden' }}>
        {cf.logo
          ? <img src={cf.logo} alt={branch.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }} />
          : <Building2 size={16} strokeWidth={1.75} style={{ color:'var(--accent)' }} />}
        {cf.is_matriz && (
          <span title="Matriz" style={{ position:'absolute', top:-4, right:-4, background:'var(--accent)', borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Star size={8} style={{ color:'#fff' }} fill="#fff" />
          </span>
        )}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{branch.name}</span>
          {cf.is_matriz && (
            <span style={{ fontSize:10, fontWeight:700, color:'var(--accent)', background:'color-mix(in srgb, var(--accent) 12%, transparent)', borderRadius:99, padding:'1px 7px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Matriz</span>
          )}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, display:'flex', gap:8, flexWrap:'wrap' }}>
          {cf.cnpj && <span style={{ fontFamily:'var(--mono)' }}>{cf.cnpj}</span>}
          {cf.cnae && <span>CNAE {cf.cnae}</span>}
          {(cf.cidade || cf.uf) && <span>{[cf.cidade, cf.uf].filter(Boolean).join('/')}</span>}
          {cf.responsavel && <span>{cf.responsavel}</span>}
        </div>
      </div>
      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
        <button onClick={() => onEdit(branch)} title="Editar" style={{ background:'none', border:'none', cursor:'pointer', padding:5, color:'var(--text-muted)', borderRadius:6 }}>
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(branch.id)} title="Excluir" style={{ background:'none', border:'none', cursor:'pointer', padding:5, color:'#ef4444', borderRadius:6 }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function GerenciarUnidades() {
  const { branches, loading, saving, error, save, remove } = useBranches()
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(null)

  function handleNew() { setEditando('novo'); setForm(UNIT_EMPTY) }
  function handleEdit(b) {
    setEditando(b.id)
    setForm({ id: b.id, name: b.name, custom_fields: b.custom_fields || {} })
  }
  function handleCancel() { setEditando(null); setForm(null) }

  async function handleSave() {
    const result = await save(form)
    if (result?.ok) handleCancel()
    else if (result?.error) alert('Erro: ' + result.error)
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover esta unidade?')) return
    const result = await remove(id)
    if (!result?.ok) alert('Erro: ' + result?.error)
  }

  const isFirst = branches.length === 0

  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--surface2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Unidades cadastradas</span>
          <span style={{ fontSize:11, color:'var(--text-muted)', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:99, padding:'1px 8px' }}>
            {loading ? '…' : branches.length}
          </span>
        </div>
        {editando !== 'novo' && (
          <button onClick={handleNew} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, border:'none', background:'var(--accent)', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            <Plus size={12} /> Nova unidade
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding:'10px 16px', fontSize:12, color:'#ef4444', borderTop:'1px solid var(--border)' }}>
          Erro ao carregar: {error}
        </div>
      )}

      {editando === 'novo' && (
        <UnitForm value={form} onChange={setForm} onSave={handleSave} onCancel={handleCancel} saving={saving} isFirst={isFirst} />
      )}

      {loading ? (
        <div style={{ padding:'20px 16px', textAlign:'center', fontSize:12, color:'var(--text-muted)', borderTop:'1px solid var(--border)' }}>
          Carregando…
        </div>
      ) : branches.length === 0 && editando !== 'novo' ? (
        <div style={{ padding:'24px 16px', textAlign:'center', fontSize:12, color:'var(--text-muted)', borderTop:'1px solid var(--border)' }}>
          <Building2 size={24} style={{ color:'var(--border)', marginBottom:8, display:'block', margin:'0 auto 8px' }} />
          Nenhuma unidade cadastrada. Cadastre a Matriz primeiro.
        </div>
      ) : branches.map(b => (
        <div key={b.id}>
          {editando === b.id ? (
            <UnitForm value={form} onChange={setForm} onSave={handleSave} onCancel={handleCancel} saving={saving} />
          ) : (
            <UnitRow branch={b} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EmpresaISV() {
  const [companies, setCompanies] = useLocalState(COMPANIES_STORAGE_KEY, MOCK_COMPANIES)
  const isv = useMemo(() => companies.find(c => c.type === 'ISV'), [companies])
  const [form, setForm] = useState(null)
  const { branches, save: saveBranch } = useBranches()

  const current = form || isv
  const temMatriz = branches.some(b => b.custom_fields?.is_matriz)

  if (!isv) return (
    <div style={{ padding:32, color:'var(--text-muted)', fontSize:14 }}>Organização não encontrada.</div>
  )

  function set(k, v) { setForm(f => ({ ...(f || isv), [k]: v })) }

  async function handleSave() {
    const updated = { ...(form || isv), updated_at: new Date().toISOString() }
    setCompanies(prev => prev.map(c => c.id === isv.id ? updated : c))

    // Auto-cria Matriz se ainda não existe
    if (!temMatriz && updated.name?.trim()) {
      await saveBranch({
        name: updated.name.trim(),
        custom_fields: {
          is_matriz: true,
          cnpj: updated.cnpj || '',
          responsavel: '',
          cidade: updated.city || '',
          uf: updated.state || '',
          cep: updated.cep || '',
          logradouro: updated.address || '',
          email: updated.email || '',
          telefone: updated.phone || '',
        },
      })
    }

    setForm(null)
  }

  const nomeOk = current?.name?.trim().length > 0
  const razaoOk = current?.corporate_name?.trim().length > 0
  const podeGravar = nomeOk && razaoOk

  return (
    <FullPageEdit
      title="Empresa / ISV"
      subtitle={isv.corporate_name || isv.name}
      onSave={podeGravar ? handleSave : undefined}
      onCancel={() => setForm(null)}
    >
      {/* ── Organização: campos obrigatórios ── */}
      <FPESection
        title="Organização"
        description="Campos obrigatórios para ativação da conta. Ao salvar pela primeira vez, a Matriz será criada automaticamente como primeira unidade do sistema."
      >
        <FPEGrid>
          <FPEField label="Nome da Organização" required style={{ gridColumn:'1/-1' }}>
            <input className="fpe-field" value={current.name || ''}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: NG Informática" />
          </FPEField>
          <FPEField label="Razão Social" required style={{ gridColumn:'1/-1' }}>
            <input className="fpe-field" value={current.corporate_name || ''}
              onChange={e => set('corporate_name', e.target.value)}
              placeholder="Ex: NG Informática Tecnologia da Informação Ltda" />
          </FPEField>
        </FPEGrid>

        {!podeGravar && (
          <div style={{ marginTop:8, padding:'8px 12px', background:'color-mix(in srgb, var(--accent) 8%, transparent)', border:'1px solid color-mix(in srgb, var(--accent) 25%, transparent)', borderRadius:8, fontSize:12, color:'var(--accent)' }}>
            Preencha Nome da Organização e Razão Social para habilitar o cadastro.
          </div>
        )}

        {!temMatriz && podeGravar && (
          <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:8, fontSize:12, color:'#10B981' }}>
            ★ Ao salvar, a Matriz será criada automaticamente com o nome da organização.
          </div>
        )}
      </FPESection>

      {/* ── Dados complementares ── */}
      <FPESection title="Dados complementares">
        <FPEGrid>
          <FPEField label="CNPJ">
            <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} value={current.cnpj || ''}
              onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
          </FPEField>
          <FPEField label="Website">
            <input className="fpe-field" value={current.website || ''}
              onChange={e => set('website', e.target.value)} placeholder="https://suaempresa.com.br" />
          </FPEField>
          <FPEField label="E-mail">
            <input className="fpe-field" type="email" value={current.email || ''}
              onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com.br" />
          </FPEField>
          <FPEField label="Telefone">
            <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} value={current.phone || ''}
              onChange={e => set('phone', e.target.value)} placeholder="(11) 0000-0000" />
          </FPEField>
        </FPEGrid>
      </FPESection>

      {/* ── White-label ── */}
      <FPESection title="Identidade Visual (White-label)">
        <FPEGrid>
          <FPEField label="Cor primária">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="color" value={current.primary_color || '#6366F1'} onChange={e => set('primary_color', e.target.value)}
                style={{ width:36, height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
              <input className="fpe-field" style={{ fontFamily:'var(--mono)', fontSize:12 }} value={current.primary_color || ''} onChange={e => set('primary_color', e.target.value)} placeholder="#6366F1" />
            </div>
          </FPEField>
          <FPEField label="Cor de destaque">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="color" value={current.accent_color || '#10B981'} onChange={e => set('accent_color', e.target.value)}
                style={{ width:36, height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
              <input className="fpe-field" style={{ fontFamily:'var(--mono)', fontSize:12 }} value={current.accent_color || ''} onChange={e => set('accent_color', e.target.value)} placeholder="#10B981" />
            </div>
          </FPEField>
          <FPEField label="Prévia">
            <div style={{ display:'flex', gap:6 }}>
              <span style={{ padding:'6px 14px', borderRadius:7, background:current.primary_color || 'var(--accent)', color:'#fff', fontSize:12, fontWeight:700 }}>Primária</span>
              <span style={{ padding:'6px 14px', borderRadius:7, background:current.accent_color || '#10B981', color:'#fff', fontSize:12, fontWeight:700 }}>Destaque</span>
            </div>
          </FPEField>
        </FPEGrid>
        <FPEField label="Observações internas">
          <textarea className="fpe-field" rows={2} style={{ resize:'vertical' }} value={current.notes || ''}
            onChange={e => set('notes', e.target.value)} placeholder="Anotações internas sobre a organização." />
        </FPEField>
      </FPESection>

      {/* ── Unidades ── */}
      <FPESection
        title="Unidades"
        description="Cada unidade é uma branch obrigatória no sistema. Todo dado (oportunidade, contato, empresa) pertence a uma unidade. O campo branch é preenchido automaticamente pelo usuário logado."
      >
        <GerenciarUnidades />
      </FPESection>
    </FullPageEdit>
  )
}
