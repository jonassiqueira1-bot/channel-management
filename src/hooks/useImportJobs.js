// Store global (módulo, fora do React) de progresso de importações em andamento.
// Existe fora do ciclo de vida de qualquer tela — ao contrário de um useState local
// dentro do modal de importação, sobrevive à navegação entre rotas (o modal/página
// que iniciou o job pode fechar/desmontar que o job e seu progresso continuam
// visíveis no ImportProgressWidget, montado uma vez em AppLayout).
import { useState, useEffect } from 'react'

let jobs = []
const listeners = new Set()

function notify() { listeners.forEach(fn => fn(jobs)) }

function genId() { return `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

export function startImportJob({ label, total }) {
  const id = genId()
  jobs = [...jobs, { id, label, current: 0, total, subLabel: '', status: 'running', createdAt: Date.now() }]
  notify()
  return id
}

export function updateImportJob(id, patch) {
  jobs = jobs.map(j => j.id === id ? { ...j, ...patch } : j)
  notify()
}

export function finishImportJob(id, patch = {}) {
  jobs = jobs.map(j => j.id === id ? { ...j, ...patch, status: patch.status || 'done' } : j)
  notify()
}

export function dismissImportJob(id) {
  jobs = jobs.filter(j => j.id !== id)
  notify()
}

export function subscribeImportJobs(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getImportJobsSnapshot() { return jobs }

// ─── Hook de leitura reativa (usado pelo widget flutuante) ───────────────────
export function useImportJobs() {
  const [state, setState] = useState(jobs)
  useEffect(() => subscribeImportJobs(setState), [])
  return state
}
