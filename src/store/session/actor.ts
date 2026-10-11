import { SEED_USERS } from '@/data/seed';
import type { User } from '@/types';

let actor: User = SEED_USERS[0];

export function getActor(): User {
  return actor;
}

export function setActor(user: User) {
  actor = user;
}
