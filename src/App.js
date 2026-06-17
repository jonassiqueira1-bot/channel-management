import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Franquias from './pages/Franquias'
import Unidades from './pages/Unidades'
import Vendedores from './pages/Vendedores'
import Habilitacoes from './pages/Habilitacoes'
import Pipeline from './pages/Pipeline'
import Acoes from './pages/Acoes'
import Tarefas from './pages/Tarefas'
import Metas from './pages/Metas'
import Campanhas from './pages/Campanhas'
import Empresas from './pages/Empresas'
import Contatos from './pages/Contatos'
import Contratos from './pages/Contratos'
import Pagamentos from './pages/Pagamentos'
import Projetos from './pages/Projetos'
import Playbooks from './pages/Playbooks'
import Comissoes from './pages/Comissoes'
import CustomerSuccess from './pages/CustomerSuccess'
import Settings, { SettingsPage } from './pages/Settings'
import SettingsCampanhas from './pages/settings/Campanhas'
import SettingsFranquias from './pages/settings/Franquias'
import SettingsHabilitacoes from './pages/settings/Habilitacoes'
import SettingsUsuarios from './pages/settings/Usuarios'
import SettingsTiposAcao from './pages/settings/TiposAcao'
import SettingsEmpresa from './pages/settings/Empresa'
import SettingsPerfis from './pages/Perfis'
import SettingsForms from './pages/settings/Forms'
import SettingsIntegracoes from './pages/settings/Integracoes'
import MyAccount from './pages/MyAccount'
import Produtos from './pages/Produtos'
import Questionarios from './pages/Questionarios'
import Documentos from './pages/Documentos'
import SuperAdmin from './pages/SuperAdmin'
import BranchSharing from './pages/settings/BranchSharing'
import Funis from './pages/Funis'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/franquias" element={<Franquias />} />
            {/* /unidades removido — gerenciado via Cadastro Unificado de Empresas */}
            <Route path="/vendedores" element={<Vendedores />} />
            {/* /habilitacoes movido para Configurações → Habilitações */}
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/acoes" element={<Acoes />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/metas" element={<Metas />} />
            <Route path="/campanhas" element={<Campanhas />} />
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/contatos" element={<Contatos />} />
            <Route path="/contratos" element={<Contratos />} />
            <Route path="/pagamentos" element={<Pagamentos />} />
            <Route path="/projetos"      element={<Projetos />} />
            <Route path="/questionarios" element={<Questionarios />} />
            <Route path="/documentos"   element={<Documentos />} />
            <Route path="/playbooks"     element={<Playbooks />} />
            <Route path="/comissoes"   element={<Comissoes />} />
            <Route path="/customer-success" element={<CustomerSuccess />} />
            <Route path="/my-account" element={<MyAccount />} />

            {/* ── Configurações ── */}
            <Route path="/settings" element={<Settings />}>
              <Route path="empresa"      element={<SettingsEmpresa />} />
              <Route path="conta"        element={<MyAccount />} />
              <Route path="usuarios"     element={<SettingsUsuarios />} />
              <Route path="perfis"       element={<SettingsPerfis />} />
              <Route path="habilitacoes" element={<SettingsHabilitacoes />} />
              <Route path="funis"        element={<Funis />} />
              <Route path="produtos"     element={<Produtos />} />
              <Route path="comissoes"    element={<SettingsPage title="Esteira de Comissões"  description="Configure a estrutura de comissionamento do canal." />} />
              <Route path="tipos-acoes"  element={<SettingsTiposAcao />} />
              <Route path="integracoes"  element={<SettingsIntegracoes />} />
              <Route path="forms"        element={<SettingsForms />} />
              <Route path="logs"         element={<SettingsPage title="Logs"                  description="Histórico de eventos e auditoria do sistema." />} />
              <Route path="campanhas"    element={<SettingsCampanhas />} />
              <Route path="franquias"    element={<SettingsFranquias />} />
              <Route path="compartilhamento" element={<BranchSharing />} />
            </Route>
            <Route path="/super-admin" element={<SuperAdmin />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
