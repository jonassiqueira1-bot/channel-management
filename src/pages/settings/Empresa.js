import { useState, useMemo, useRef } from 'react'
import { Building2, Star, Upload, ImageOff } from 'lucide-react'
import { useLocalState } from '../../hooks/useLocalState'
import { MOCK_COMPANIES, COMPANIES_STORAGE_KEY } from '../../data/mockCompanies'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../../components/ui'
import BrowseLayout from '../../components/BrowseLayout'
import { useBranches } from '../../hooks/useBranches'

// ─── Formulário de Unidade ─────────────────────────────────────────────────────
const UNIT_EMPTY = {
  name: '',
  custom_fields: {
    cnpj: '', cnae: '', cep: '', logradouro: '', cidade: '', uf: '',
    email: '', telefone: '', website: '', responsavel: '', is_matriz: false,
    primary_color: '', accent_color: '', notes: '',
  },
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

const BRANCH_COLUMNS = [
  {
    key: 'nome',
    label: 'Unidade',
    render: (_, row) => {
      const cf = row.custom_fields || {}
      return (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:7, background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative', flexShrink:0 }}>
            {cf.logo
              ? <img src={cf.logo} alt="" style={{ width:'100%', height:'100%', objectFit:'contain', padding:3 }} />
              : <Building2 size={13} style={{ color:'var(--accent)' }} />}
            {cf.is_matriz && (
              <span style={{ position:'absolute', top:-3, right:-3, background:'var(--accent)', borderRadius:'50%', width:12, height:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Star size={7} fill="#fff" style={{ color:'#fff' }} />
              </span>
            )}
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontWeight:600, color:'var(--text)' }}>{row.name}</span>
              {cf.is_matriz && <span style={{ fontSize:9, fontWeight:700, color:'var(--accent)', background:'color-mix(in srgb, var(--accent) 12%, transparent)', borderRadius:99, padding:'1px 6px', textTransform:'uppercase' }}>Matriz</span>}
            </div>
            {cf.cnae && <div style={{ fontSize:11, color:'var(--text-muted)' }}>CNAE {cf.cnae}</div>}
          </div>
        </div>
      )
    },
  },
  {
    key: 'cnpj',
    label: 'CNPJ',
    width: 160,
    render: (_, row) => <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)' }}>{row.custom_fields?.cnpj || '—'}</span>,
  },
  {
    key: 'cidade',
    label: 'Cidade / UF',
    width: 140,
    render: (_, row) => {
      const cf = row.custom_fields || {}
      return <span style={{ color:'var(--text-muted)' }}>{[cf.cidade, cf.uf].filter(Boolean).join(' / ') || '—'}</span>
    },
  },
  {
    key: 'responsavel',
    label: 'Responsável',
    width: 160,
    render: (_, row) => <span style={{ color:'var(--text-muted)' }}>{row.custom_fields?.responsavel || '—'}</span>,
  },
]

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EmpresaISV() {
  const [companies, setCompanies] = useLocalState(COMPANIES_STORAGE_KEY, MOCK_COMPANIES)
  const isv = useMemo(() => companies.find(c => c.type === 'ISV'), [companies])
  const [form, setForm] = useState(null)
  const { branches, loading: loadingBranches, error: errorBranches, save: saveBranch, remove: removeBranch } = useBranches()
  const [editandoUnidade, setEditandoUnidade] = useState(null) // null | 'novo' | branch object
  const [formUnidade, setFormUnidade] = useState(null)
  const [confirmDelUnidade, setConfirmDelUnidade] = useState(false)

  const current = form || isv
  const temMatriz = branches.some(b => b.custom_fields?.is_matriz)

  if (!isv) return (
    <div style={{ padding:32, color:'var(--text-muted)', fontSize:14 }}>Organização não encontrada.</div>
  )

  // ── Org handlers ──
  function set(k, v) { setForm(f => ({ ...(f || isv), [k]: v })) }

  async function handleSaveOrg() {
    const updated = { ...(form || isv), updated_at: new Date().toISOString() }
    setCompanies(prev => prev.map(c => c.id === isv.id ? updated : c))
    if (!temMatriz && updated.name?.trim()) {
      await saveBranch({ name: updated.name.trim(), custom_fields: { is_matriz: true } })
    }
    setForm(null)
  }

  const nomeOk = current?.name?.trim().length > 0
  const razaoOk = current?.corporate_name?.trim().length > 0
  const podeGravar = nomeOk && razaoOk

  // ── Unidade handlers ──
  function abrirNovaUnidade() {
    setFormUnidade({ name: '', custom_fields: { cnpj:'', cnae:'', cep:'', logradouro:'', cidade:'', uf:'', email:'', telefone:'', responsavel:'', is_matriz:false } })
    setEditandoUnidade('novo')
    setConfirmDelUnidade(false)
  }
  function abrirEditarUnidade(b) {
    setFormUnidade({ id: b.id, name: b.name, custom_fields: b.custom_fields || {} })
    setEditandoUnidade(b)
    setConfirmDelUnidade(false)
  }
  function fecharUnidade() { setEditandoUnidade(null); setFormUnidade(null); setConfirmDelUnidade(false) }

  async function handleSaveUnidade() {
    if (!formUnidade?.name?.trim()) return
    const result = await saveBranch(formUnidade)
    if (result?.ok !== false) fecharUnidade()
    else alert('Erro: ' + result?.error)
  }

  async function handleDeleteUnidade() {
    if (!editandoUnidade?.id) return
    const result = await removeBranch(editandoUnidade.id)
    if (result?.ok !== false) fecharUnidade()
    else alert('Erro: ' + result?.error)
  }

  // ── Early return: edição de unidade ──
  if (editandoUnidade !== null && formUnidade) {
    const cf = formUnidade.custom_fields || {}
    const setUf = (k, v) => setFormUnidade(f => ({ ...f, [k]: v }))
    const setCf = (k, v) => setFormUnidade(f => ({ ...f, custom_fields: { ...f.custom_fields, [k]: v } }))

    return (
      <FullPageEdit
        title={editandoUnidade === 'novo' ? 'Nova Unidade' : editandoUnidade.name}
        subtitle={editandoUnidade === 'novo' ? 'Cadastro de unidade' : (cf.is_matriz ? 'Matriz' : 'Filial')}
        onSave={formUnidade.name?.trim() ? handleSaveUnidade : undefined}
        onCancel={fecharUnidade}
      >
        <FPESection title="Logotipo">
          <LogoUpload value={cf.logo || ''} onChange={v => setCf('logo', v)} />
        </FPESection>

        <FPESection title="Identificação">
          <FPEGrid>
            <FPEField label="Nome da Unidade" required style={{ gridColumn:'1/-1' }}>
              <input className="fpe-field" value={formUnidade.name || ''}
                onChange={e => setUf('name', e.target.value)}
                placeholder={branches.length === 0 ? 'Ex: Matriz — NG Informática SP' : 'Ex: Filial Campinas'} />
            </FPEField>
          </FPEGrid>
        </FPESection>

        <FPESection title="Endereço">
          <FPEGrid>
            <FPEField label="CEP">
              <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} value={cf.cep || ''}
                onChange={e => setCf('cep', e.target.value)} placeholder="00000-000" />
            </FPEField>
            <FPEField label="UF">
              <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} maxLength={2} value={cf.uf || ''}
                onChange={e => setCf('uf', e.target.value.toUpperCase())} placeholder="SP" />
            </FPEField>
            <FPEField label="Logradouro" style={{ gridColumn:'1/-1' }}>
              <input className="fpe-field" value={cf.logradouro || ''}
                onChange={e => setCf('logradouro', e.target.value)} placeholder="Av. Paulista, 1374 — Sala 101" />
            </FPEField>
            <FPEField label="Cidade" style={{ gridColumn:'1/-1' }}>
              <input className="fpe-field" value={cf.cidade || ''}
                onChange={e => setCf('cidade', e.target.value)} placeholder="São Paulo" />
            </FPEField>
          </FPEGrid>
        </FPESection>

        <FPESection title="Contato">
          <FPEGrid>
            <FPEField label="CNPJ">
              <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} value={cf.cnpj || ''}
                onChange={e => setCf('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
            </FPEField>
            <FPEField label="CNAE">
              <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} value={cf.cnae || ''}
                onChange={e => setCf('cnae', e.target.value)} placeholder="6202-3/00" />
            </FPEField>
            <FPEField label="Website">
              <input className="fpe-field" value={cf.website || ''}
                onChange={e => setCf('website', e.target.value)} placeholder="https://suaempresa.com.br" />
            </FPEField>
            <FPEField label="E-mail">
              <input className="fpe-field" type="email" value={cf.email || ''}
                onChange={e => setCf('email', e.target.value)} placeholder="contato@empresa.com.br" />
            </FPEField>
            <FPEField label="Telefone">
              <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} value={cf.telefone || ''}
                onChange={e => setCf('telefone', e.target.value)} placeholder="(11) 0000-0000" />
            </FPEField>
            <FPEField label="Responsável">
              <input className="fpe-field" value={cf.responsavel || ''}
                onChange={e => setCf('responsavel', e.target.value)} placeholder="Nome do responsável" />
            </FPEField>
          </FPEGrid>
        </FPESection>

        <FPESection title="Identidade Visual (White-label)">
          <FPEGrid>
            <FPEField label="Cor primária">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={cf.primary_color || '#000000'} onChange={e => setCf('primary_color', e.target.value)}
                  style={{ width:36, height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
                <input className="fpe-field" style={{ fontFamily:'var(--mono)', fontSize:12 }} value={cf.primary_color || ''}
                  onChange={e => setCf('primary_color', e.target.value)} placeholder="#000000" />
              </div>
            </FPEField>
            <FPEField label="Cor de destaque">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={cf.accent_color || '#10B981'} onChange={e => setCf('accent_color', e.target.value)}
                  style={{ width:36, height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
                <input className="fpe-field" style={{ fontFamily:'var(--mono)', fontSize:12 }} value={cf.accent_color || ''}
                  onChange={e => setCf('accent_color', e.target.value)} placeholder="#10B981" />
              </div>
            </FPEField>
            <FPEField label="Prévia">
              <div style={{ display:'flex', gap:6 }}>
                {cf.primary_color && <span style={{ padding:'6px 14px', borderRadius:7, background:cf.primary_color, color:'#fff', fontSize:12, fontWeight:700 }}>Primária</span>}
                {cf.accent_color && <span style={{ padding:'6px 14px', borderRadius:7, background:cf.accent_color, color:'#fff', fontSize:12, fontWeight:700 }}>Destaque</span>}
              </div>
            </FPEField>
          </FPEGrid>
          <FPEField label="Observações internas">
            <textarea className="fpe-field" rows={2} style={{ resize:'vertical' }} value={cf.notes || ''}
              onChange={e => setCf('notes', e.target.value)} placeholder="Anotações internas sobre esta unidade." />
          </FPEField>
        </FPESection>

        <FPESection title="Configuração">
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none' }}>
            <input type="checkbox" checked={!!cf.is_matriz} onChange={e => setCf('is_matriz', e.target.checked)}
              style={{ width:14, height:14, accentColor:'var(--accent)', cursor:'pointer' }} />
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Esta unidade é a Matriz</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>Branch padrão do sistema para usuários sem filial definida</div>
            </div>
          </label>
        </FPESection>

        {editandoUnidade !== 'novo' && (
          <FPESection title="Zona de perigo">
            {!confirmDelUnidade ? (
              <button onClick={() => setConfirmDelUnidade(true)}
                style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #ef4444', background:'none', color:'#ef4444', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Remover unidade
              </button>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:13, color:'var(--text-muted)' }}>Confirmar remoção de <strong>{editandoUnidade.name}</strong>?</span>
                <button onClick={handleDeleteUnidade}
                  style={{ padding:'6px 14px', borderRadius:7, border:'none', background:'#ef4444', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Confirmar
                </button>
                <button onClick={() => setConfirmDelUnidade(false)}
                  style={{ padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', fontSize:12, cursor:'pointer' }}>
                  Cancelar
                </button>
              </div>
            )}
          </FPESection>
        )}
      </FullPageEdit>
    )
  }

  // ── View principal ──
  return (
    <FullPageEdit
      title="Empresa / ISV"
      subtitle={isv.corporate_name || isv.name}
      onSave={podeGravar ? handleSaveOrg : undefined}
      onCancel={() => setForm(null)}
    >
      <FPESection
        title="Organização"
        description="Campos obrigatórios para ativação da conta. Ao salvar pela primeira vez, a Matriz será criada automaticamente como primeira unidade do sistema."
      >
        <FPEGrid>
          <FPEField label="Nome da Organização" required style={{ gridColumn:'1/-1' }}>
            <input className="fpe-field" value={current.name || ''}
              onChange={e => set('name', e.target.value)} placeholder="Ex: NG Informática" />
          </FPEField>
          <FPEField label="Razão Social" required style={{ gridColumn:'1/-1' }}>
            <input className="fpe-field" value={current.corporate_name || ''}
              onChange={e => set('corporate_name', e.target.value)} placeholder="Ex: NG Informática Tecnologia da Informação Ltda" />
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

      <FPESection
        title="Unidades"
        description="Cada unidade é uma branch obrigatória no sistema. Todo dado pertence a uma unidade e o campo branch é preenchido automaticamente pelo usuário logado."
      >
        <div style={{ gridColumn:'1/-1', height:400, border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          <BrowseLayout
            columns={BRANCH_COLUMNS}
            data={branches}
            storageKey="empresa_unidades"
            newLabel="Nova unidade"
            onNew={abrirNovaUnidade}
            onRowClick={abrirEditarUnidade}
            emptyState={
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, color:'var(--text-muted)' }}>
                <Building2 size={28} style={{ opacity:0.3 }} />
                <span style={{ fontSize:13 }}>Nenhuma unidade cadastrada. Cadastre a Matriz primeiro.</span>
              </div>
            }
          />
        </div>
      </FPESection>
    </FullPageEdit>
  )
}
