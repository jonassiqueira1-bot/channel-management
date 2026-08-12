// Reconhece links de vídeo hospedados fora (YouTube, Panda Video) e devolve a
// URL de embed correspondente — o Boostly nunca hospeda o vídeo em si, só
// reproduz o que já está hospedado externamente (custo de streaming/CDN fica
// com o provedor, não com a gente).
export function getVideoEmbedUrl(link) {
  if (!link) return null
  try {
    const url = new URL(link)
    const host = url.hostname.replace(/^www\./, '')

    // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2]
        : url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2]
        : url.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1)
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    // Panda Video: costuma já vir como player-vz-xxxx.tv.pandavideo.com.br/embed/?v=ID
    // ou watch.pandavideo.com.br/v/ID — normaliza pros dois formatos conhecidos.
    if (host.endsWith('pandavideo.com.br') || host.endsWith('pandavideo.com')) {
      if (url.pathname.includes('/embed/')) return link
      const id = url.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player-vz.tv.pandavideo.com.br/embed/?v=${id}` : null
    }

    return null
  } catch {
    return null
  }
}

export function isVideoLink(link) {
  return !!getVideoEmbedUrl(link)
}
