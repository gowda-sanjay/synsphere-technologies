export type DataSource = "supabase" | "demo";

export type DataResult<T> = {
  data: T;
  source: DataSource;
  error: string | null;
};

export function dataResult<T>(data: T, source: DataSource, error: string | null = null): DataResult<T> {
  return { data, source, error };
}

export const SUPABASE_NOT_CONFIGURED = "Supabase is not configured. This action is unavailable in the preview.";