// Central de documentação de apoio do Boostly — hospedada separadamente
// (Docusaurus) em help.boostly.com.br. Este arquivo é o único lugar que deve
// conhecer essas URLs; nenhum outro componente deve hardcodá-las.

export const DOCS_BASE_URL = 'https://help.boostly.com.br'

// URL contextual por módulo — a chave é livre, usada via <DocsLink module="chave" />.
// Basta adicionar uma entrada aqui para habilitar o link contextual daquele
// módulo; não é preciso alterar DocsLink nem HelpButton.
export const DOCS_MODULE_URLS = {
  contratos:     `${DOCS_BASE_URL}/modulos/contratos`,
  pagamentos:    `${DOCS_BASE_URL}/modulos/pagamentos`,
  comissoes:     `${DOCS_BASE_URL}/modulos/comissoes`,
  playbooks:     `${DOCS_BASE_URL}/modulos/playbooks`,
  relatorios:    `${DOCS_BASE_URL}/modulos/relatorios`,
  questionarios: `${DOCS_BASE_URL}/modulos/questionarios`,
  projetos:      `${DOCS_BASE_URL}/modulos/projetos`,
}

// Resolve a URL de um módulo; cai para a URL geral se não houver entrada
// específica — assim um link contextual nunca fica quebrado.
export function getDocsUrl(moduleKey) {
  return (moduleKey && DOCS_MODULE_URLS[moduleKey]) || DOCS_BASE_URL
}
