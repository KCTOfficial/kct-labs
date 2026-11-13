import * as migration_20261109_113225_initial from './20261109_113225_initial'

export const migrations = [
  {
    up: migration_20261109_113225_initial.up,
    down: migration_20261109_113225_initial.down,
    name: '20261109_113225_initial',
  },
]
