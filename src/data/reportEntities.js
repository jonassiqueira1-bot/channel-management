// ─── Catálogo de entidades do novo construtor de Relatórios ──────────────────
// Espelha as fontes já existentes em useDocumentDataSources.js (mesmos ids,
// labels e ícones — o usuário não deve ver dois catálogos diferentes pelo
// sistema), mas acrescenta o que faltava pro motor de relacionamentos: quais
// entidades se conectam a quais, por qual campo, e com que cardinalidade.
//
// Cada relacionamento foi conferido contra o schema real (supabase/migrations)
// antes de entrar aqui — nenhuma FK inventada. Os dois marcados como
// "verificarNoUso" são os únicos onde não achei a migration que cria a coluna
// com certeza (contracts.company_id) — o motor de junção lida com isso de
// forma segura: se o campo não existir de fato, a junção simplesmente não
// encontra correspondência (linhas ficam sem o relacionado), não quebra nada.
export const ENTIDADES = [
  { id: 'pipeline',    label: 'Oportunidades',       icon: '📈' },
  { id: 'empresas',    label: 'Empresas',            icon: '🏢' },
  { id: 'contatos',    label: 'Contatos',            icon: '👤' },
  { id: 'projetos',    label: 'Projetos',            icon: '🏗️' },
  { id: 'contratos',   label: 'Contratos',           icon: '📄' },
  { id: 'pagamentos',  label: 'Pagamentos',          icon: '💰' },
  { id: 'comissoes',   label: 'Comissões',           icon: '💸' },
  { id: 'campanhas',   label: 'Campanhas',           icon: '📣' },
  { id: 'acoes',       label: 'Ações',                icon: '⚡' },
  { id: 'metas',       label: 'Metas',                icon: '🎯' },
  { id: 'parceiros',   label: 'Parceiros',            icon: '🤝' },
  { id: 'vendedores',  label: 'Contatos Canais',      icon: '🧑‍💼' },
  { id: 'customer_health', label: 'Sucesso do Cliente', icon: '❤️' },
  { id: 'documentos',  label: 'Documentos',           icon: '🗂️' },
  { id: 'playbooks',   label: 'Playbooks',            icon: '📚' },
]

// Campanhas, Documentos e Playbooks continuam selecionáveis como entidade
// principal (fase 1) — só não entraram em RELACIONAMENTOS porque não achei
// FK real conectando elas a outra entidade no schema atual (campanha_id não
// existe em oportunidades, documents/playbooks não têm company_id). Ficam
// disponíveis "isoladas" até o schema ganhar essas colunas.

// `campo`  — nome da coluna de chave estrangeira.
// `fkEm`   — qual lado ("de" ou "para") tem essa coluna, apontando pro `id`
//            do outro lado. Convenção única evita ambiguidade na hora de
//            montar o join de verdade.
// `cardinalidade` — sempre do ponto de vista de "de".
export const RELACIONAMENTOS = [
  { de: 'empresas',  para: 'pipeline',       campo: 'company_id',  fkEm: 'para', cardinalidade: 'um_para_muitos', rotulo: '1 empresa → várias oportunidades' },
  { de: 'empresas',  para: 'projetos',       campo: 'company_id',  fkEm: 'para', cardinalidade: 'um_para_muitos', rotulo: '1 empresa → vários projetos' },
  { de: 'empresas',  para: 'contatos',       campo: 'company_id',  fkEm: 'para', cardinalidade: 'um_para_muitos', rotulo: '1 empresa → vários contatos' },
  { de: 'empresas',  para: 'customer_health', campo: 'company_id', fkEm: 'para', cardinalidade: 'um_para_um',     rotulo: '1 empresa → 1 registro de saúde' },
  { de: 'empresas',  para: 'acoes',          campo: 'company_id',  fkEm: 'para', cardinalidade: 'um_para_muitos', rotulo: '1 empresa → várias ações' },
  { de: 'empresas',  para: 'pagamentos',     campo: 'company_id',  fkEm: 'para', cardinalidade: 'um_para_muitos', rotulo: '1 empresa → vários pagamentos' },
  { de: 'empresas',  para: 'comissoes',      campo: 'company_id',  fkEm: 'para', cardinalidade: 'um_para_muitos', rotulo: '1 empresa → várias comissões' },
  { de: 'empresas',  para: 'contratos',      campo: 'company_id',  fkEm: 'para', cardinalidade: 'um_para_muitos', rotulo: '1 empresa → vários contratos', verificarNoUso: true },
  { de: 'contratos', para: 'pagamentos',     campo: 'contract_id', fkEm: 'para', cardinalidade: 'um_para_muitos', rotulo: '1 contrato → vários pagamentos' },
  { de: 'contratos', para: 'comissoes',      campo: 'contract_id', fkEm: 'para', cardinalidade: 'um_para_muitos', rotulo: '1 contrato → várias comissões' },
  { de: 'projetos',  para: 'pipeline',       campo: 'opportunity_id', fkEm: 'de', cardinalidade: 'muitos_para_um', rotulo: 'vários projetos → 1 oportunidade de origem' },
  { de: 'parceiros', para: 'vendedores',     campo: 'parceiro_id', fkEm: 'para', cardinalidade: 'um_para_muitos', rotulo: '1 parceiro → vários contatos canais' },
]

// Entidades relacionadas diretamente a uma entidade (nos dois sentidos).
export function relacionadasDe(entidadeId) {
  const diretas = RELACIONAMENTOS.filter(r => r.de === entidadeId || r.para === entidadeId)
  return diretas.map(r => {
    const outroId = r.de === entidadeId ? r.para : r.de
    return { entidade: ENTIDADES.find(e => e.id === outroId), relacao: r, direcao: r.de === entidadeId ? 'para' : 'de' }
  }).filter(x => x.entidade)
}

// Acha o relacionamento direto entre duas entidades, em qualquer ordem.
export function relacaoEntre(aId, bId) {
  return RELACIONAMENTOS.find(r => (r.de === aId && r.para === bId) || (r.de === bId && r.para === aId)) || null
}
