import type { DataSource } from "@/lib/services/result";

export function DataSourceNotice({ source, error }: { source: DataSource; error?: string | null }) {
  if (error) {
    return <div className="data-source-notice is-error shell" role="alert"><strong>We couldn’t load this information.</strong><span>{error}</span></div>;
  }

  if (source === "demo") {
    return <div className="data-source-notice shell" role="note"><strong>Preview data</strong><span>Examples are for development only and are not verified listings or outcomes.</span></div>;
  }

  return null;
}