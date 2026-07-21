// ─── Catálogo de entidades do novo construtor de Relatórios ──────────────────
// Espelha as fontes já existentes em useDocumentDataSources.js (mesmos ids,
// labels e ícones — o usuário não deve ver dois catálogos diferentes pelo
// sistema), mas acrescenta o que faltava pro motor de relacionamentos: quais
// entidades se conectam a quais, por qual campo, e com que cardinalidade.
//
// Isso ainda não busca dado nenhum — é só o mapa. A etapa de fato buscar e
// combinar os dados (JOIN em JS a partir do que o Supabase retorna) é o
// próximo passo depois que a UI dos passos 1-2 estiver validada.

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

// Relacionamento direto entre duas entidades. `de`/`para` são ids de ENTIDADES;
// `campo` é o nome lógico da chave estrangeira (ainda a mapear pro select()
// real quando ligarmos ao Supabase); `cardinalidade` é sempre do ponto de
// vista de "de" — 'um_para_muitos' significa 1 registro de "de" pode ter
// vários relacionados em "para".
export const RELACIONAMENTOS = [
  { de: 'empresas',  para: 'pipeline',   campo: 'company_id',    cardinalidade: 'um_para_muitos', rotulo: '1 empresa → várias oportunidades' },
  { de: 'empresas',  para: 'contratos',  campo: 'company_id',    cardinalidade: 'um_para_muitos', rotulo: '1 empresa → vários contratos' },
  { de: 'empresas',  para: 'projetos',   campo: 'company_id',    cardinalidade: 'um_para_muitos', rotulo: '1 empresa → vários projetos' },
  { de: 'empresas',  para: 'contatos',   campo: 'company_id',    cardinalidade: 'um_para_muitos', rotulo: '1 empresa → vários contatos' },
  { de: 'empresas',  para: 'customer_health', campo: 'company_id', cardinalidade: 'um_para_um', rotulo: '1 empresa → 1 registro de saúde' },
  { de: 'empresas',  para: 'documentos', campo: 'company_id',    cardinalidade: 'um_para_muitos', rotulo: '1 empresa → vários documentos' },
  { de: 'contratos', para: 'pagamentos', campo: 'contract_id',   cardinalidade: 'um_para_muitos', rotulo: '1 contrato → vários pagamentos' },
  { de: 'contratos', para: 'comissoes',  campo: 'contract_id',   cardinalidade: 'um_para_muitos', rotulo: '1 contrato → várias comissões' },
  { de: 'pipeline',  para: 'vendedores', campo: 'responsavel',   cardinalidade: 'muitos_para_um', rotulo: 'várias oportunidades → 1 vendedor' },
  { de: 'pipeline',  para: 'campanhas',  campo: 'campanha_id',   cardinalidade: 'muitos_para_um', rotulo: 'várias oportunidades → 1 campanha' },
  { de: 'projetos',  para: 'acoes',      campo: 'project_id',    cardinalidade: 'um_para_muitos', rotulo: '1 projeto → várias ações/tarefas' },
  { de: 'projetos',  para: 'pipeline',   campo: 'opportunity_id', cardinalidade: 'muitos_para_um', rotulo: 'vários projetos → 1 oportunidade de origem' },
  { de: 'parceiros', para: 'vendedores', campo: 'parceiro_id',   cardinalidade: 'um_para_muitos', rotulo: '1 parceiro → vários contatos canais' },
]

// Entidades relacionadas diretamente a uma entidade (nos dois sentidos).
export function relacionadasDe(entidadeId) {
  const diretas = RELACIONAMENTOS.filter(r => r.de === entidadeId || r.para === entidadeId)
  return diretas.map(r => {
    const outroId = r.de === entidadeId ? r.para : r.de
    return { entidade: ENTIDADES.find(e => e.id === outroId), relacao: r, direcao: r.de === entidadeId ? 'para' : 'de' }
  }).filter(x => x.entidade)
}
