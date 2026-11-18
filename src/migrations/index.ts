import * as migration_20261118_172517_initial from './20261118_172517_initial';

export const migrations = [
  {
    up: migration_20261118_172517_initial.up,
    down: migration_20261118_172517_initial.down,
    name: '20261118_172517_initial'
  },
];
