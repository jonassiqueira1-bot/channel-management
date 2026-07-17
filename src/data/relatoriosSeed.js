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

export const RELATORIOS_SEED = [RELATORIO_HORAS_PROJETO]
