export type StatusPayload = {
  ready: boolean;
  stage: string;
  progress: number;
  message: string;
};

export type OverviewPayload = {
  rows: number;
  columns: number;
  avg_daily_minutes: number;
  avg_happiness: number;
  avg_stress: number;
  high_addiction_risk_rate: number;
  countries: number;
  targets: Record<string, Record<string, number>>;
};

export type EdaPayload = {
  age_histogram: Record<string, number>;
  gender_distribution: Record<string, number>;
  country_distribution: Record<string, number>;
  income_distribution: Record<string, number>;
  employment_distribution: Record<string, number>;
  education_distribution: Record<string, number>;
  relationship_distribution: Record<string, number>;
  generation_distribution: Record<string, number>;
  usage_by_generation: Record<string, number>;
  content_theme_distribution: Record<string, number>;
  content_type_distribution: Record<string, number>;
  usage_metrics: Record<string, number>;
};

export type ClustersPayload = {
  share_by_persona: Record<string, number>;
  cluster_profiles: Array<Record<string, string | number>>;
  pca_sample: Array<Record<string, string | number>>;
  definitions: Record<string, { name: string; emoji: string; color: string }>;
};

export type AdvancedPayload = {
  cohort_analysis: Array<Record<string, string | number>>;
  country_analysis: Array<Record<string, string | number>>;
  urban_rural: Array<Record<string, string | number>>;
  stratified_happiness: Array<Record<string, string | number>>;
  summary: Record<string, string | number | null>;
};

export type ModelsPayload = {
  regression: Array<Record<string, string | number>>;
  classification: Array<Record<string, string | number>>;
  best_regression: Array<Record<string, string | number>>;
  best_classification: Array<Record<string, string | number>>;
};

export type FeatureImportancePayload = {
  target: string;
  rows: Array<{ feature: string; importance: number }>;
};

export type FeatureSchemaPayload = {
  numeric: Record<string, { min: number; max: number; median: number; p25: number; p75: number }>;
  categorical: Record<string, string[]>;
};

export type PredictionPayload = {
  predictions: Array<{ target: string; value: number }>;
  nearest_persona: string;
  cluster_id: number;
};

export type UploadProfilePayload = {
  dataset_id: string;
  rows: number;
  columns: number;
  column_names: string[];
  dtypes: Record<string, string>;
  missing: Record<string, number>;
  preview: Array<Record<string, string | number>>;
  candidate_targets: Array<{ column: string; task_type: string }>;
  numeric_summary?: Record<string, Record<string, number>>;
};

export type UploadTrainPayload = {
  artifact_id: string;
  task_type: string;
  target: string;
  metrics: Array<Record<string, string | number>>;
  best_model: Record<string, string | number>;
  feature_columns: string[];
  train_rows: number;
  test_rows: number;
};

export type UploadPredictPayload = {
  artifact_id: string;
  target: string;
  task_type: string;
  rows: Array<Record<string, string | number>>;
};

export type UploadInsightsPayload = {
  dataset_id: string;
  insights: string[];
  top_correlations: Record<string, number>;
};

export type InstagramDistributionRow = {
  bucket: string;
  count: number;
};

export type InstagramUsageStressRow = {
  usage_bucket: string;
  avg_predicted_stress: number;
  avg_predicted_happiness: number;
  rows: number;
};

export type InstagramScoringPayload = {
  mode: string;
  summary: {
    source_rows: number;
    rows_scored: number;
    was_truncated: boolean;
    avg_predicted_happiness: number;
    avg_predicted_stress: number;
    avg_predicted_engagement: number;
    avg_predicted_addiction_risk: number;
    high_addiction_risk_rate: number;
    dominant_persona: string;
    unique_personas: number;
    unique_countries: number;
  };
  insights: string[];
  persona_share: Record<string, number>;
  stress_distribution: InstagramDistributionRow[];
  happiness_distribution: InstagramDistributionRow[];
  engagement_distribution: InstagramDistributionRow[];
  addiction_distribution: InstagramDistributionRow[];
  usage_stress_summary: InstagramUsageStressRow[];
  country_summary: Array<{
    country: string;
    users: number;
    avg_predicted_stress: number;
    avg_predicted_happiness: number;
    avg_predicted_engagement: number;
    high_addiction_rate: number;
  }>;
  persona_outcome_matrix: Array<{
    nearest_persona: string;
    users: number;
    avg_predicted_stress: number;
    avg_predicted_happiness: number;
    avg_predicted_engagement: number;
    avg_addiction_risk: number;
  }>;
  top_prediction_correlations: Record<string, Record<string, number>>;
  preview_rows: Array<Record<string, string | number>>;
  export_rows: Array<Record<string, string | number>>;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const GET_TIMEOUT_MS = 8_000;
const POST_TIMEOUT_MS = 120_000;

function getTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return undefined;
  }

  return AbortSignal.timeout(timeoutMs);
}

function formatFetchError(path: string, error: unknown): Error {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new Error(`Request timed out for ${path}. Please retry — the backend is busy or unreachable.`);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(`Request failed for ${path}.`);
}

async function buildResponseError(path: string, response: Response): Promise<Error> {
  let detail = "";

  try {
    const payload = (await response.json()) as { detail?: string };
    detail = payload.detail ?? "";
  } catch {
    detail = "";
  }

  return new Error(detail ? detail : `Request failed for ${path}: ${response.status}`);
}

async function request<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      signal: getTimeoutSignal(GET_TIMEOUT_MS),
    });
  } catch (error) {
    throw formatFetchError(path, error);
  }

  if (!response.ok) {
    throw await buildResponseError(path, response);
  }

  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: getTimeoutSignal(POST_TIMEOUT_MS),
    });
  } catch (error) {
    throw formatFetchError(path, error);
  }

  if (!response.ok) {
    throw await buildResponseError(path, response);
  }

  return response.json() as Promise<T>;
}

async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      body: formData,
      signal: getTimeoutSignal(POST_TIMEOUT_MS),
    });
  } catch (error) {
    throw formatFetchError(path, error);
  }

  if (!response.ok) {
    throw await buildResponseError(path, response);
  }

  return response.json() as Promise<T>;
}

export function getStatus(): Promise<StatusPayload> {
  return request<StatusPayload>("/api/status");
}

export function getOverview(): Promise<OverviewPayload> {
  return request<OverviewPayload>("/api/dataset/overview");
}

export function getEda(): Promise<EdaPayload> {
  return request<EdaPayload>("/api/dataset/eda");
}

export function getClusters(): Promise<ClustersPayload> {
  return request<ClustersPayload>("/api/clusters");
}

export function getAdvanced(): Promise<AdvancedPayload> {
  return request<AdvancedPayload>("/api/advanced");
}

export function getModels(): Promise<ModelsPayload> {
  return request<ModelsPayload>("/api/models/catalog");
}

export function getFeatureImportance(target: string): Promise<FeatureImportancePayload> {
  return request<FeatureImportancePayload>(`/api/models/feature-importance?target=${encodeURIComponent(target)}`);
}

export function getFeatureSchema(): Promise<FeatureSchemaPayload> {
  return request<FeatureSchemaPayload>("/api/dataset/feature-schema");
}

export function postProjectPrediction(features: Record<string, string | number>): Promise<PredictionPayload> {
  return postJson<PredictionPayload>("/api/predict", { features });
}

export function retrainProjectModels(): Promise<StatusPayload> {
  return postJson<StatusPayload>("/api/admin/retrain", {});
}

export function uploadProfile(file: File): Promise<UploadProfilePayload> {
  const formData = new FormData();
  formData.append("file", file);
  return postFormData<UploadProfilePayload>("/api/upload/profile", formData);
}

export function trainUploadedModel(payload: {
  dataset_id: string;
  target: string;
  features?: string[];
  task_type?: string;
  test_size?: number;
}): Promise<UploadTrainPayload> {
  return postJson<UploadTrainPayload>("/api/upload/train", payload);
}

export function predictUploadedRows(payload: { artifact_id: string; rows: Array<Record<string, string | number>> }): Promise<UploadPredictPayload> {
  return postJson<UploadPredictPayload>("/api/upload/predict", payload);
}

export function getUploadInsights(datasetId: string): Promise<UploadInsightsPayload> {
  return request<UploadInsightsPayload>(`/api/upload/insights?dataset_id=${encodeURIComponent(datasetId)}`);
}

export function uploadInstagramSchema(file: File): Promise<InstagramScoringPayload> {
  const formData = new FormData();
  formData.append("file", file);
  return postFormData<InstagramScoringPayload>("/api/upload/predict-instagram", formData);
}

export { API_BASE_URL };

