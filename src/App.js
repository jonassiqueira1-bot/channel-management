import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { BranchProvider } from './contexts/BranchContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'

// Code-splitting por rota — antes todas as ~50 páginas eram importadas de
// forma estática aqui, então o navegador baixava/parseava o bundle inteiro
// do sistema (Pipeline.js e Projetos.js sozinhos passam de 5-7 mil linhas)
// antes de exibir até a tela de login. Com lazy(), cada rota vira um chunk
// próprio, buscado só quando o usuário de fato navega até ela.
const Login               = lazy(() => import('./pages/Login'))
const ForgotPassword      = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword       = lazy(() => import('./pages/ResetPassword'))
const Signup              = lazy(() => import('./pages/Signup'))
const AceitarConvite      = lazy(() => import('./pages/AceitarConvite'))
const Dashboard           = lazy(() => import('./pages/Dashboard'))
const Franquias           = lazy(() => import('./pages/Franquias'))
const Vendedores          = lazy(() => import('./pages/Vendedores'))
const Pipeline            = lazy(() => import('./pages/Pipeline'))
const Acoes               = lazy(() => import('./pages/Acoes'))
const Tarefas             = lazy(() => import('./pages/Tarefas'))
const Metas               = lazy(() => import('./pages/Metas'))
const Campanhas           = lazy(() => import('./pages/Campanhas'))
const Empresas            = lazy(() => import('./pages/Empresas'))
const Contatos            = lazy(() => import('./pages/Contatos'))
const Contratos           = lazy(() => import('./pages/Contratos'))
const Pagamentos          = lazy(() => import('./pages/Pagamentos'))
const Projetos            = lazy(() => import('./pages/Projetos'))
const Playbooks           = lazy(() => import('./pages/Playbooks'))
const Comissoes           = lazy(() => import('./pages/Comissoes'))
const CustomerSuccess     = lazy(() => import('./pages/CustomerSuccess'))
const SettingsModule      = lazy(() => import('./pages/Settings'))
const SettingsCampanhas   = lazy(() => import('./pages/settings/Campanhas'))
const SettingsParceiros   = lazy(() => import('./pages/settings/Franquias'))
const SettingsIndicadores = lazy(() => import('./pages/settings/Indicadores'))
const SettingsMetas       = lazy(() => import('./pages/settings/Metas'))
const SettingsHabilitacoes= lazy(() => import('./pages/settings/Habilitacoes'))
const SettingsUsuarios    = lazy(() => import('./pages/settings/Usuarios'))
const SettingsTiposAcao   = lazy(() => import('./pages/settings/TiposAcao'))
const SettingsEmpresa     = lazy(() => import('./pages/settings/Empresa'))
const SettingsPerfis      = lazy(() => import('./pages/Perfis'))
const SettingsForms       = lazy(() => import('./pages/settings/Forms'))
const SettingsIntegracoes = lazy(() => import('./pages/settings/Integracoes'))
const SettingsLogs        = lazy(() => import('./pages/settings/Logs'))
const SettingsAlertas     = lazy(() => import('./pages/settings/Alertas'))
const MyAccount           = lazy(() => import('./pages/MyAccount'))
const Produtos            = lazy(() => import('./pages/Produtos'))
const TabelaPrecos        = lazy(() => import('./pages/TabelaPrecos'))
const Questionarios       = lazy(() => import('./pages/Questionarios'))
const Documentos          = lazy(() => import('./pages/Documentos'))
const BranchSharing       = lazy(() => import('./pages/settings/BranchSharing'))
const SettingsEquipes     = lazy(() => import('./pages/settings/Equipes'))
const Funis               = lazy(() => import('./pages/Funis'))
const Relatorios          = lazy(() => import('./pages/Relatorios'))
const FechamentoHoras     = lazy(() => import('./pages/FechamentoHoras'))
const ParceirosPage       = lazy(() => import('./pages/Parceiros'))
const SettingsMaturidade  = lazy(() => import('./pages/settings/MaturidadeParceiros'))
const SettingsMaturidadeVendedores = lazy(() => import('./pages/settings/MaturidadeVendedores'))
const SettingsAssinatura  = lazy(() => import('./pages/settings/Assinatura'))
const ConfirmarAssinatura = lazy(() => import('./pages/ConfirmarAssinatura'))

function CrispWidget() {
  useEffect(() => {
    window.$crisp = []
    window.CRISP_WEBSITE_ID = '5c56d2db-e204-4cb5-a19b-465e8d3cd17c'
    const s = document.createElement('script')
    s.src = 'https://client.crisp.chat/l.js'
    s.async = true
    document.head.appendChild(s)

  }, [])
  return null
}

function RouteFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg, #fff)' }} />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CrispWidget />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/confirmar-assinatura" element={<ConfirmarAssinatura />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/aceitar-convite" element={<AceitarConvite />} />
          <Route
            element={
              <ProtectedRoute>
                <BranchProvider>
                  <AppLayout />
                </BranchProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/franquias" element={<Franquias />} />
            {/* /unidades removido — gerenciado via Cadastro Unificado de Empresas */}
            <Route path="/vendedores" element={<Vendedores />} />
            {/* /habilitacoes movido para Configurações → Habilitações */}
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/acoes"     element={<Acoes />} />
            <Route path="/parceiros" element={<ParceirosPage />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/metas" element={<Metas />} />
            <Route path="/campanhas" element={<Campanhas />} />
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/contatos" element={<Contatos />} />
            <Route path="/contratos" element={<Contratos />} />
            <Route path="/pagamentos" element={<Pagamentos />} />
            <Route path="/projetos"      element={<Projetos />} />
            <Route path="/fechamento-horas" element={<FechamentoHoras />} />
            <Route path="/questionarios" element={<Questionarios />} />
            <Route path="/documentos"   element={<Documentos />} />
            <Route path="/playbooks"     element={<Playbooks />} />
            <Route path="/comissoes"   element={<Comissoes />} />
            <Route path="/customer-success" element={<CustomerSuccess />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/my-account" element={<MyAccount />} />

            {/* ── Configurações ── */}
            <Route path="/settings" element={<SettingsModule />}>
              <Route path="empresa"      element={<SettingsEmpresa />} />
              <Route path="conta"        element={<MyAccount />} />
              <Route path="usuarios"     element={<SettingsUsuarios />} />
              <Route path="perfis"       element={<SettingsPerfis />} />
              <Route path="habilitacoes" element={<SettingsHabilitacoes />} />
              <Route path="funis"        element={<Funis />} />
              <Route path="produtos"     element={<Produtos />} />
              <Route path="tabela-precos" element={<TabelaPrecos />} />
              <Route path="comissoes"    element={<Comissoes />} />
              <Route path="tipos-acoes"  element={<SettingsTiposAcao />} />
              <Route path="integracoes"  element={<SettingsIntegracoes />} />
              <Route path="alertas"      element={<SettingsAlertas />} />
              <Route path="forms"        element={<SettingsForms />} />
              <Route path="logs"         element={<SettingsLogs />} />
              <Route path="campanhas"    element={<SettingsCampanhas />} />
              <Route path="franquias"    element={<SettingsParceiros />} />
              <Route path="maturidade-parceiros" element={<SettingsMaturidade />} />
              <Route path="maturidade-vendedores" element={<SettingsMaturidadeVendedores />} />
              <Route path="indicadores"  element={<SettingsIndicadores />} />
              <Route path="metas"        element={<SettingsMetas />} />
              <Route path="compartilhamento" element={<BranchSharing />} />
              <Route path="equipes"          element={<SettingsEquipes />} />
              <Route path="assinatura"       element={<SettingsAssinatura />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
