// Relatório(s) padrão do produto — semeados automaticamente pra tenants novos
// (mesmo padrão de perfisAcessoSeed.js: só roda quando o tenant nunca teve
// nenhuma linha desse tipo, nem soft-deletada — ver useRelatorios.js).

export const RELATORIO_HORAS_PROJETO = {
  titulo: 'Horas por Projeto — Estimado x Executado',
  tipo: 'relatorio',
  acesso: 'equipe',
  papeis_permitidos: ['admin_isv', 'financeiro', 'projetos'],
  status: 'publicado',
  config: {
    tamanhoPagina: 'A4',
    margens: { top: 76, right: 76, bottom: 76, left: 76 },
    fundoPagina: { tipo: 'cor', cor: '#ffffff' },
    cabecalho: { ativo: true, tipoFundo: 'cor', corFundo: '#1E3A5F', titulo: 'Horas por Projeto', subtitulo: 'Estimado x Executado' },
    rodape: { ativo: true, texto: '', paginacao: true },
  },
  elementos: [
    { id: 'el_seed_1', tipo: 'kpi', x: 0, y: 0, w: 206, h: 100,
      dados: { sourceId: 'projetos', titulo: 'Horas Estimadas (total)', metrica: 'SUM', campoY: 'horas_est', cor: '#2563EB' } },
    { id: 'el_seed_2', tipo: 'kpi', x: 218, y: 0, w: 206, h: 100,
      dados: { sourceId: 'projetos', titulo: 'Horas Executadas (total)', metrica: 'SUM', campoY: 'horas_exec', cor: '#10B981' } },
    { id: 'el_seed_3', tipo: 'kpi', x: 436, y: 0, w: 206, h: 100,
      dados: { sourceId: 'projetos', titulo: 'Qtd. de Projetos', metrica: 'COUNT', cor: '#F59E0B' } },
    { id: 'el_seed_4', tipo: 'tabela_dinamica', x: 0, y: 108, w: 642, h: 320,
      dados: {
        sourceId: 'projetos', titulo: 'Horas por Projeto', campoAgrupador: 'nome',
        colunas: [
          { id: 'c1', tipo: 'sum', campo: 'horas_est', label: 'Estimado (h)' },
          { id: 'c2', tipo: 'sum', campo: 'horas_exec', label: 'Executado (h)' },
        ],
        ordenar: 'valor_desc', limite: 50,
      } },
  ],
}

export const RELATORIO_PERFORMANCE_CAMPANHAS = {
  titulo: 'Performance de Campanhas — Meta x Realizado',
  tipo: 'relatorio',
  acesso: 'equipe',
  papeis_permitidos: ['admin_isv', 'marketing', 'vendas'],
  status: 'publicado',
  config: {
    tamanhoPagina: 'A4',
    margens: { top: 76, right: 76, bottom: 76, left: 76 },
    fundoPagina: { tipo: 'cor', cor: '#ffffff' },
    cabecalho: { ativo: true, tipoFundo: 'cor', corFundo: '#1E3A5F', titulo: 'Performance de Campanhas', subtitulo: 'Meta x Realizado' },
    rodape: { ativo: true, texto: '', paginacao: true },
  },
  elementos: [
    { id: 'el_seed_1', tipo: 'kpi', x: 0, y: 0, w: 206, h: 100,
      dados: { sourceId: 'campanhas', titulo: 'Meta de Valor (R$, total)', metrica: 'SUM', campoY: 'meta_valor', cor: '#2563EB' } },
    { id: 'el_seed_2', tipo: 'kpi', x: 218, y: 0, w: 206, h: 100,
      dados: { sourceId: 'campanhas', titulo: 'Valor Realizado (R$, total)', metrica: 'SUM', campoY: 'valor_realizado', cor: '#10B981' } },
    { id: 'el_seed_3', tipo: 'kpi', x: 436, y: 0, w: 206, h: 100,
      dados: { sourceId: 'campanhas', titulo: 'Oportunidades Ganhas (total)', metrica: 'SUM', campoY: 'oportunidades_ganhas', cor: '#F59E0B' } },
    { id: 'el_seed_4', tipo: 'tabela_dinamica', x: 0, y: 108, w: 642, h: 320,
      dados: {
        sourceId: 'campanhas', titulo: 'Campanhas — Meta x Realizado', campoAgrupador: 'nome',
        colunas: [
          { id: 'c1', tipo: 'sum', campo: 'meta_valor', label: 'Meta de Valor (R$)' },
          { id: 'c2', tipo: 'sum', campo: 'valor_realizado', label: 'Realizado (R$)' },
          { id: 'c3', tipo: 'sum', campo: 'atingimento_valor_pct', label: 'Atingimento (%)' },
          { id: 'c4', tipo: 'sum', campo: 'meta_oportunidades', label: 'Meta Oport.' },
          { id: 'c5', tipo: 'sum', campo: 'oportunidades_ganhas', label: 'Oport. Ganhas' },
        ],
        ordenar: 'valor_desc', limite: 50,
      } },
  ],
}

export const RELATORIO_CONSUMO_TREINAMENTO = {
  titulo: 'Consumo de Treinamento — Módulos por Ação',
  tipo: 'relatorio',
  acesso: 'equipe',
  papeis_permitidos: ['admin_isv'],
  status: 'publicado',
  config: {
    tamanhoPagina: 'A4',
    margens: { top: 76, right: 76, bottom: 76, left: 76 },
    fundoPagina: { tipo: 'cor', cor: '#ffffff' },
    cabecalho: { ativo: true, tipoFundo: 'cor', corFundo: '#1E3A5F', titulo: 'Consumo de Treinamento', subtitulo: 'Módulos por Ação' },
    rodape: { ativo: true, texto: '', paginacao: true },
  },
  elementos: [
    { id: 'el_seed_1', tipo: 'kpi', x: 0, y: 0, w: 206, h: 100,
      dados: { sourceId: 'treinamento_modulos', titulo: 'Participantes elegíveis (total)', metrica: 'SUM', campoY: 'participantes_elegiveis', cor: '#2563EB' } },
    { id: 'el_seed_2', tipo: 'kpi', x: 218, y: 0, w: 206, h: 100,
      dados: { sourceId: 'treinamento_modulos', titulo: 'Concluíram (total)', metrica: 'SUM', campoY: 'concluiram', cor: '#10B981' } },
    { id: 'el_seed_3', tipo: 'kpi', x: 436, y: 0, w: 206, h: 100,
      dados: { sourceId: 'treinamento_modulos', titulo: 'Iniciaram e não concluíram (total)', metrica: 'SUM', campoY: 'iniciaram_nao_concluiram', cor: '#D97706' } },
    { id: 'el_seed_4', tipo: 'tabela_dinamica', x: 0, y: 108, w: 642, h: 320,
      dados: {
        sourceId: 'treinamento_modulos', titulo: 'Por Módulo', campoAgrupador: 'modulo_titulo',
        colunas: [
          { id: 'c1', tipo: 'sum', campo: 'participantes_elegiveis',  label: 'Elegíveis' },
          { id: 'c2', tipo: 'sum', campo: 'concluiram',               label: 'Concluíram' },
          { id: 'c3', tipo: 'sum', campo: 'pct_concluido',            label: '% concluído' },
          { id: 'c4', tipo: 'sum', campo: 'iniciaram_nao_concluiram', label: 'Iniciaram e não concluíram' },
          { id: 'c5', tipo: 'sum', campo: 'tempo_medio_dias',         label: 'Tempo médio (dias)' },
        ],
        ordenar: 'valor_desc', limite: 50,
      } },
  ],
}

export const RELATORIOS_SEED = [RELATORIO_HORAS_PROJETO, RELATORIO_PERFORMANCE_CAMPANHAS, RELATORIO_CONSUMO_TREINAMENTO]
