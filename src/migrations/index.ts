import * as migration_20261109_113225_initial from './20261109_113225_initial'
import * as migration_20261123_124811_legal_documents from './20261123_124811_legal_documents'
import * as migration_20261126_132400_app_page_sections from './20261126_132400_app_page_sections'

export const migrations = [
  {
    up: migration_20261109_113225_initial.up,
    down: migration_20261109_113225_initial.down,
    name: '20261109_113225_initial',
  },
  {
    up: migration_20261123_124811_legal_documents.up,
    down: migration_20261123_124811_legal_documents.down,
    name: '20261123_124811_legal_documents',
  },
  {
    up: migration_20261126_132400_app_page_sections.up,
    down: migration_20261126_132400_app_page_sections.down,
    name: '20261126_132400_app_page_sections',
  },
]
