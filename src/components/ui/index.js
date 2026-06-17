// src/components/ui/index.js
// Ponto único de importação para todos os componentes do design system.
//
// Uso:
//   import { Button, SearchField, BackButton } from '../components/ui'

// Componentes já existentes em /components (re-exportados)
export { default as Button      } from '../Button'
export { default as Input       } from '../Input'
export { default as EmptyState  } from '../EmptyState'
export { default as SearchSelect} from '../SearchSelect'
export { default as Badge       } from '../Badge'
export { default as PageHeader  } from '../PageHeader'

// Componentes novos em /components/ui
export { default as SearchField    } from './SearchField'
export { default as BackButton     } from './BackButton'
export { default as SelectRelation } from './SelectRelation'

// Layout especializado de Pipeline (Kanban + controles)
export { default as PipelineLayout } from './PipelineLayout'

// Tela de edição full-page (substitui modais em CRUDs complexos)
export { default as FullPageEdit, FPESection, FPEField, FPEGrid, FPESeparator, AsideCard } from './FullPageEdit'

// SlideOver e utilitários de formulário
export { default as SlideOver, FormGrid, FormSection, FormField } from './SlideOver'

// Tokens de design
export * as theme from './theme'

// Hierarquia tipográfica
export { type, fontSize, fontWeight, lineHeight } from './typography'
