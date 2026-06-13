import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Building2, Shield, Camera, Save, X, Eye, EyeOff,
  CheckCircle2, AlertCircle, ChevronLeft, Phone, Mail,
  Briefcase, Palette, Landmark, Lock, Info,
} from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { COMPANY_TYPE_CFG } from '../data/mockCompanies'

const ACCENT = '#6366F1'
const SZ     = 14

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([])
  const push = useCallback((type, msg) => {
    const id = Date.now()
    setToasts(t => [...t, { id, type, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  return { toasts, push }
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'11px 16px', borderRadius:10, fontSize:13, fontWeight:600,
          background: t.type === 'ok' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
          color:'#fff', boxShadow:'0 4px 20px rgba(0,0,0,0.25)',
          animation:'slideUp 0.25s ease',
          maxWidth:340,
        }}>
          {t.type === 'ok'
            ? <CheckCircle2 size={15} strokeWidth={2.5} style={{ flexShrink:0 }} />
            : <AlertCircle  size={15} strokeWidth={2.5} style={{ flexShrink:0 }} />}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 18, r = 6, mb = 0 }) {
  return (
    <div style={{ width:w, height:h, borderRadius:r, background:'var(--surface2)', marginBottom:mb, overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.04) 50%,transparent 100%)', animation:'shimmer 1.4s infinite', backgroundSize:'200% 100%' }} />
    </div>
  )
}

function SkeletonProfile() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, padding:'32px 0' }}>
      <div style={{ display:'flex', alignItems:'center', gap:18 }}>
        <Skeleton w={80} h={80} r={40} />
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
          <Skeleton w="60%" h={20} r={6} />
          <Skeleton w="40%" h={14} r={5} />
        </div>
      </div>
      {[1,2,3].map(i => <Skeleton key={i} h={40} r={8} />)}
    </div>
  )
}

// ─── Força de senha ───────────────────────────────────────────────────────────
function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'transparent' }
  let score = 0
  if (pw.length >= 8)              score++
  if (/[A-Z]/.test(pw))            score++
  if (/[0-9]/.test(pw))            score++
  if (/[^A-Za-z0-9]/.test(pw))     score++
  if (pw.length >= 14)             score++
  if (score <= 1) return { score, label:'Fraca',   color:'#EF4444' }
  if (score <= 2) return { score, label:'Regular', color:'#F59E0B' }
  if (score <= 3) return { score, label:'Boa',     color:'#3B82F6' }
  return              { score, label:'Forte',   color:'#10B981' }
}

function PasswordStrengthBar({ password }) {
  const { score, label, color } = passwordStrength(password)
  if (!password) return null
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:'flex', gap:4, marginBottom:5 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex:1, height:3, borderRadius:99, background: i <= score ? color : 'var(--border)', transition:'background 0.2s' }} />
        ))}
      </div>
      <span style={{ fontSize:11, fontWeight:600, color }}>{label}</span>
    </div>
  )
}

// ─── Componentes de formulário ────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{hint}</span>}
    </div>
  )
}

const IN_BASE = {
  padding:'9px 12px', borderRadius:8, fontSize:13,
  background:'var(--surface2)', border:'1px solid var(--border)',
  color:'var(--text)', fontFamily:'var(--font)', outline:'none',
  width:'100%', boxSizing:'border-box', transition:'border-color 0.15s',
}
const IN_DISABLED = { ...IN_BASE, opacity:0.55, cursor:'not-allowed', color:'var(--text-muted)' }

function Input({ disabled, style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      disabled={disabled}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{ ...(disabled ? IN_DISABLED : IN_BASE), ...(focused ? { borderColor:ACCENT } : {}), ...style }}
    />
  )
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position:'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...IN_BASE, paddingRight:40, ...(focused ? { borderColor:ACCENT } : {}) }}
      />
      <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex', alignItems:'center' }}>
        {show ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
      </button>
    </div>
  )
}

function SaveBtn({ saving, label = 'Salvar alterações', onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={saving} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:9, background:ACCENT, border:'none', color:'#fff', fontSize:13, fontWeight:700, fontFamily:'var(--font)', cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1, boxShadow:'0 2px 8px rgba(99,102,241,0.3)', alignSelf:'flex-start' }}>
      {saving
        ? <span style={{ width:13, height:13, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
        : <Save size={13} strokeWidth={2} />}
      {saving ? 'Salvando…' : label}
    </button>
  )
}

// ─── Avatar uploader ──────────────────────────────────────────────────────────
function AvatarUploader({ profile, onUpload }) {
  const [hovering, setHovering] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    await onUpload(file)
    setUploading(false)
  }

  const SIZE = 88
  const initials = profile?.avatar || '?'
  const avatarUrl = profile?.avatar_url

  return (
    <div style={{ position:'relative', width:SIZE, height:SIZE, flexShrink:0 }}>
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{ width:SIZE, height:SIZE, borderRadius:'50%', overflow:'hidden', cursor:'pointer', position:'relative', border:`2px solid ${ACCENT}44`, transition:'border-color 0.2s', ...(hovering ? { borderColor:ACCENT } : {}) }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : (
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:`${ACCENT}18`, fontSize:SIZE * 0.34, fontWeight:800, color:ACCENT, fontFamily:'var(--mono)', letterSpacing:'-1px' }}>
              {initials}
            </div>
          )
        }
        {/* Overlay de hover */}
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, opacity: hovering || uploading ? 1 : 0, transition:'opacity 0.2s' }}>
          {uploading
            ? <span style={{ width:18, height:18, border:'2.5px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'block' }} />
            : <>
                <Camera size={18} strokeWidth={2} color="#fff" />
                <span style={{ fontSize:10, color:'#fff', fontWeight:600 }}>Trocar</span>
              </>
          }
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />
    </div>
  )
}

// ─── Seção: Meus Dados ────────────────────────────────────────────────────────
function TabMeusDados({ profile, papelCfg, onUpload, onSave }) {
  const [form, setForm] = useState({ nome: profile.nome || '', phone: profile.phone || '', cargo: profile.cargo || '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit() {
    setSaving(true)
    const res = await onSave(form)
    setSaving(false)
    return res
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Avatar + info */}
      <div style={{ display:'flex', alignItems:'center', gap:20, padding:'20px 24px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:14 }}>
        <AvatarUploader profile={profile} onUpload={onUpload} />
        <div>
          <div style={{ fontSize:17, fontWeight:800, color:'var(--text)', letterSpacing:'-0.3px' }}>{form.nome || profile.nome}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>{profile.email}</div>
          {papelCfg && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:6, padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:700, background:papelCfg.bg, color:papelCfg.text, border:`1px solid ${papelCfg.color}33` }}>
              <span style={{ fontSize:9 }}>{papelCfg.icon}</span>{papelCfg.label}
            </span>
          )}
        </div>
      </div>

      {/* Campos */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <SectionLabel icon={<User size={12} strokeWidth={2} />} label="Informações pessoais" />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Field label="Nome completo *">
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome completo" />
          </Field>
          <Field label="Cargo / Função">
            <Input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ex: Diretor Comercial" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <div style={{ position:'relative' }}>
              <Phone size={13} strokeWidth={2} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" style={{ paddingLeft:30 }} />
            </div>
          </Field>
          <Field label="E-mail" hint="O e-mail é gerenciado pelo sistema de autenticação e não pode ser alterado aqui.">
            <div style={{ position:'relative' }}>
              <Mail size={13} strokeWidth={2} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
              <Input value={profile.email} disabled style={{ paddingLeft:30 }} />
            </div>
          </Field>
        </div>
      </div>

      <SaveBtn saving={saving} onClick={submit} />
    </div>
  )
}

// ─── Seção: Minha Empresa ─────────────────────────────────────────────────────
function TabMinhaEmpresa({ company, isAdmin, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState(company ? { ...company } : {})
  const [saving, setSaving]   = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const typeCfg = COMPANY_TYPE_CFG[company?.type] || COMPANY_TYPE_CFG.CUSTOMER

  if (!company) {
    return (
      <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
        <Building2 size={32} strokeWidth={1} style={{ opacity:0.25, display:'block', margin:'0 auto 12px' }} />
        Nenhuma empresa associada ao seu perfil.
      </div>
    )
  }

  async function submit() {
    setSaving(true)
    const res = await onSave({ name: form.name, corporate_name: form.corporate_name, cnpj: form.cnpj, email: form.email, phone: form.phone, website: form.website, city: form.city, state: form.state, primary_color: form.primary_color, accent_color: form.accent_color })
    setSaving(false)
    if (res.ok) setEditing(false)
    return res
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Card da empresa */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:`${typeCfg.color}18`, border:`1px solid ${typeCfg.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Building2 size={18} strokeWidth={1.75} style={{ color:typeCfg.color }} />
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>{company.name}</span>
              <span style={{ padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:700, color:typeCfg.color, background:typeCfg.bg }}>
                {company.type === 'ISV' ? 'Organização ISV' : company.type === 'FRANCHISE' ? 'Franquia Parceira' : 'Cliente'}
              </span>
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {company.corporate_name}
              {company.cnpj && <span style={{ marginLeft:10, fontFamily:'var(--mono)' }}>{company.cnpj}</span>}
            </div>
          </div>
        </div>
        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:'none', border:`1px solid ${ACCENT}`, color:ACCENT, fontSize:12, fontFamily:'var(--font)', cursor:'pointer', fontWeight:600 }}>
            Editar dados
          </button>
        )}
      </div>

      {/* Grid de informações (modo leitura) */}
      {!editing && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18 }}>
          <InfoCell icon={<Mail size={12} />}    label="E-mail"     value={company.email}   />
          <InfoCell icon={<Phone size={12} />}   label="Telefone"   value={company.phone}   />
          <InfoCell icon={<Building2 size={12}/>} label="Cidade/UF" value={company.city && company.state ? `${company.city} / ${company.state}` : company.city || '—'} />
          <InfoCell icon={<Landmark size={12}/>}  label="CNPJ"      value={company.cnpj}    mono />
          <InfoCell icon={<Info size={12} />}     label="Website"   value={company.website} />
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Cores</span>
            <div style={{ display:'flex', gap:8 }}>
              {company.primary_color && <div style={{ width:22, height:22, borderRadius:6, background:company.primary_color, border:'1px solid var(--border)' }} title={`Primária: ${company.primary_color}`} />}
              {company.accent_color  && <div style={{ width:22, height:22, borderRadius:6, background:company.accent_color, border:'1px solid var(--border)' }} title={`Destaque: ${company.accent_color}`} />}
            </div>
          </div>
        </div>
      )}

      {/* Formulário de edição (admin_isv + tipo ISV) */}
      {editing && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionLabel icon={<Landmark size={12} strokeWidth={2} />} label="Identidade jurídica" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Field label="Nome Fantasia *">
              <Input value={form.name||''} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label="Razão Social">
              <Input value={form.corporate_name||''} onChange={e => set('corporate_name', e.target.value)} />
            </Field>
            <Field label="CNPJ">
              <Input value={form.cnpj||''} onChange={e => set('cnpj', e.target.value)} style={{ fontFamily:'var(--mono)' }} />
            </Field>
            <Field label="Website">
              <Input value={form.website||''} onChange={e => set('website', e.target.value)} placeholder="https://" />
            </Field>
            <Field label="E-mail">
              <Input value={form.email||''} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Telefone">
              <Input value={form.phone||''} onChange={e => set('phone', e.target.value)} style={{ fontFamily:'var(--mono)' }} />
            </Field>
            <Field label="Cidade">
              <Input value={form.city||''} onChange={e => set('city', e.target.value)} />
            </Field>
            <Field label="Estado (UF)">
              <Input value={form.state||''} onChange={e => set('state', e.target.value.toUpperCase())} maxLength={2} style={{ fontFamily:'var(--mono)' }} />
            </Field>
          </div>

          <SectionLabel icon={<Palette size={12} strokeWidth={2} />} label="Identidade visual" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 120px', gap:14, alignItems:'end' }}>
            <Field label="Cor primária">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={form.primary_color||'#6366F1'} onChange={e => set('primary_color', e.target.value)} style={{ width:36, height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
                <Input value={form.primary_color||''} onChange={e => set('primary_color', e.target.value)} style={{ fontFamily:'var(--mono)', fontSize:12 }} />
              </div>
            </Field>
            <Field label="Cor de destaque">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={form.accent_color||'#10B981'} onChange={e => set('accent_color', e.target.value)} style={{ width:36, height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
                <Input value={form.accent_color||''} onChange={e => set('accent_color', e.target.value)} style={{ fontFamily:'var(--mono)', fontSize:12 }} />
              </div>
            </Field>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Prévia</div>
              <div style={{ display:'flex', gap:5 }}>
                <span style={{ width:22, height:22, borderRadius:6, background:form.primary_color||'#6366F1', display:'block', border:'1px solid var(--border)' }} />
                <span style={{ width:22, height:22, borderRadius:6, background:form.accent_color||'#10B981', display:'block', border:'1px solid var(--border)' }} />
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <SaveBtn saving={saving} onClick={submit} />
            <button type="button" onClick={() => { setEditing(false); setForm({ ...company }) }} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, background:'none', border:'1px solid var(--border)', color:'var(--text-soft)', fontSize:13, fontFamily:'var(--font)', cursor:'pointer', fontWeight:500 }}>
              <X size={13} strokeWidth={2} />Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Seção: Segurança ─────────────────────────────────────────────────────────
function TabSeguranca({ onChangePassword }) {
  const [nova, setNova]       = useState('')
  const [confirma, setConfirma] = useState('')
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState(null)
  const { score } = passwordStrength(nova)

  async function submit() {
    setErr(null)
    if (!nova || nova.length < 8) { setErr('A nova senha deve ter pelo menos 8 caracteres.'); return }
    if (nova !== confirma)        { setErr('As senhas não coincidem.'); return }
    if (score < 2)                { setErr('Escolha uma senha mais forte.'); return }
    setSaving(true)
    const res = await onChangePassword(nova)
    setSaving(false)
    if (res.ok) {
      setNova(''); setConfirma('')
      return { ok: true }
    }
    setErr(res.message || 'Erro ao alterar senha.')
    return res
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:460 }}>
      <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.18)', display:'flex', gap:10 }}>
        <Info size={14} strokeWidth={2} style={{ color:ACCENT, flexShrink:0, marginTop:1 }} />
        <span style={{ fontSize:12, color:'var(--text-soft)', lineHeight:1.6 }}>
          A alteração de senha é feita diretamente pelo sistema de autenticação. Escolha uma senha com pelo menos 8 caracteres, incluindo letras maiúsculas, números e símbolos.
        </span>
      </div>

      <SectionLabel icon={<Lock size={12} strokeWidth={2} />} label="Alterar senha" />

      <Field label="Nova senha">
        <PasswordInput value={nova} onChange={e => setNova(e.target.value)} placeholder="Nova senha" />
        <PasswordStrengthBar password={nova} />
      </Field>

      <Field label="Confirmar nova senha">
        <PasswordInput value={confirma} onChange={e => setConfirma(e.target.value)} placeholder="Repita a nova senha" />
        {confirma && nova !== confirma && (
          <span style={{ fontSize:11, color:'#EF4444', fontWeight:600, display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
            <AlertCircle size={11} strokeWidth={2.5} />As senhas não coincidem.
          </span>
        )}
        {confirma && nova === confirma && nova.length >= 8 && (
          <span style={{ fontSize:11, color:'#10B981', fontWeight:600, display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
            <CheckCircle2 size={11} strokeWidth={2.5} />Senhas coincidem.
          </span>
        )}
      </Field>

      {err && (
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 12px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:13 }}>
          <AlertCircle size={13} strokeWidth={2} />{err}
        </div>
      )}

      <SaveBtn saving={saving} label="Alterar senha" onClick={submit} />
    </div>
  )
}

// ─── Helpers de layout ─────────────────────────────────────────────────────────
function SectionLabel({ icon, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>
      <span style={{ color:'var(--text-muted)' }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase' }}>{label}</span>
    </div>
  )
}

function InfoCell({ icon, label, value, mono }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:4 }}>
        <span style={{ color:'var(--text-muted)' }}>{icon}</span>{label}
      </div>
      <div style={{ fontSize:13, color: value ? 'var(--text)' : 'var(--text-muted)', fontFamily: mono ? 'var(--mono)' : 'var(--font)', fontStyle: value ? 'normal' : 'italic' }}>
        {value || '—'}
      </div>
    </div>
  )
}

const TABS = [
  { id:'dados',    label:'Meus Dados',    icon: <User     size={SZ} strokeWidth={1.75} /> },
  { id:'empresa',  label:'Minha Empresa', icon: <Building2 size={SZ} strokeWidth={1.75} /> },
  { id:'seguranca',label:'Segurança',     icon: <Shield   size={SZ} strokeWidth={1.75} /> },
]

// ─── Página ────────────────────────────────────────────────────────────────────
export default function MyAccount() {
  const navigate = useNavigate()
  const { profile, company, loading, error, reload, saveProfile, saveCompany, changePassword, uploadAvatar, isAdmin, papelCfg } = useProfile()
  const [tab, setTab] = useState('dados')
  const { toasts, push } = useToasts()

  async function handleSaveProfile(patch) {
    const res = await saveProfile(patch)
    push(res.ok ? 'ok' : 'err', res.ok ? 'Perfil atualizado com sucesso.' : res.message)
    return res
  }

  async function handleUpload(file) {
    const res = await uploadAvatar(file)
    push(res.ok ? 'ok' : 'err', res.ok ? 'Avatar atualizado.' : res.message)
  }

  async function handleSaveCompany(patch) {
    const res = await saveCompany(patch)
    push(res.ok ? 'ok' : 'err', res.ok ? 'Dados da empresa atualizados.' : res.message)
    return res
  }

  async function handleChangePassword(nova) {
    const res = await changePassword(nova)
    push(res.ok ? 'ok' : 'err', res.ok ? 'Senha alterada com sucesso.' : res.message)
    return res
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <style>{`
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Cabeçalho ── */}
      <div style={{ padding:'20px 32px 0', flexShrink:0 }}>
        <button onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 0', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:12, fontFamily:'var(--font)', marginBottom:14 }}>
          <ChevronLeft size={14} strokeWidth={2} />Voltar
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`${ACCENT}14`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <User size={16} strokeWidth={1.75} style={{ color:ACCENT }} />
          </div>
          <div>
            <h1 style={{ fontSize:18, fontWeight:800, color:'var(--text)', margin:0, letterSpacing:'-0.3px' }}>Minha Conta</h1>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>Gerencie seus dados pessoais, empresa e segurança</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)' }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', background:'none', border:'none', borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent', cursor:'pointer', fontSize:13, fontWeight: active ? 700 : 500, fontFamily:'var(--font)', color: active ? ACCENT : 'var(--text-muted)', transition:'color 0.15s, border-color 0.15s', marginBottom:-1, whiteSpace:'nowrap' }}>
                <span style={{ color: active ? ACCENT : 'var(--text-muted)', transition:'color 0.15s' }}>{t.icon}</span>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
        {error && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:13, marginBottom:24 }}>
            <AlertCircle size={14} strokeWidth={2} />{error}
            <button onClick={reload} style={{ marginLeft:'auto', padding:'2px 8px', borderRadius:5, background:'none', border:'1px solid rgba(239,68,68,0.3)', color:'#EF4444', cursor:'pointer', fontSize:11, fontFamily:'var(--font)' }}>Tentar novamente</button>
          </div>
        )}

        {loading
          ? <SkeletonProfile />
          : profile && (
            <>
              {tab === 'dados'     && <TabMeusDados     profile={profile}   papelCfg={papelCfg} onUpload={handleUpload} onSave={handleSaveProfile} />}
              {tab === 'empresa'   && <TabMinhaEmpresa  company={company}   isAdmin={isAdmin}    onSave={handleSaveCompany} />}
              {tab === 'seguranca' && <TabSeguranca                                              onChangePassword={handleChangePassword} />}
            </>
          )
        }
      </div>

      <ToastStack toasts={toasts} />
    </div>
  )
}
