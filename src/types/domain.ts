/** Shape of the existing Yawmi task JSON. Optional fields preserve old backups. */
export interface TaskRecord {
  id?: number | string;
  t?: string;
  due?: string;
  done?: boolean;
  del?: boolean;
  urgent?: boolean;
  important?: boolean;
  order?: number;
  time?: string;
  repeat?: string;
  pj?: number | string | null;
  subs?: ReadonlyArray<{ t?: string; done?: boolean }>;
}

/** Shape of the existing Yawmi note JSON; no data migration is performed. */
export interface NoteRecord {
  id?: number | string;
  t?: string;
  body?: string;
  u?: number;
  pinned?: boolean;
  del?: boolean;
  color?: string;
}
