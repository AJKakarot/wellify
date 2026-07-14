import type {
  AdherenceSummary,
  ApiResponse,
  ChatResponse,
  DashboardData,
  ExerciseLog,
  FoodLog,
  GoalRecommendationWindow,
  HealthResponse,
  LogCreateResponse,
  NutritionGoals,
  NutritionPeriod,
  NutritionProgress,
  NutritionSummary,
  VoiceLog,
  WaterLog,
  WeeklyInsight,
  WeightLog,
} from "@health-tracker/types";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  session: AuthSession;
}

export interface ApiClientOptions {
  baseUrl: string;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly headers?: HeadersInit;
  private readonly credentials: RequestCredentials;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.headers = options.headers;
    this.credentials = options.credentials ?? "include";
  }

  resolveAssetUrl(path?: string | null) {
    if (!path) return null;
    if (/^https?:\/\//.test(path)) return path;
    return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: this.credentials,
      headers: {
        ...this.headers,
        ...(init?.headers ?? {}),
      },
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? ((await response.json()) as T) : (undefined as T);

    if (!response.ok) {
      throw data;
    }

    return data;
  }

  private json<T>(path: string, method: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  getHealth(): Promise<HealthResponse> {
    return this.request("/health");
  }

  signUp(payload: { email: string; password: string; name: string }): Promise<AuthResponse> {
    return this.json("/api/auth/sign-up/email", "POST", payload);
  }

  signIn(payload: { email: string; password: string }): Promise<AuthResponse> {
    return this.json("/api/auth/sign-in/email", "POST", payload);
  }

  signOut(): Promise<{ success: boolean }> {
    return this.json("/api/auth/sign-out", "POST");
  }

  getSession(): Promise<{ session: AuthSession; user: AuthUser } | null> {
    return this.request("/api/auth/get-session");
  }

  createLog(content: string): Promise<LogCreateResponse> {
    return this.json("/api/logs", "POST", { content });
  }

  createChat(message: string): Promise<ChatResponse> {
    return this.json("/api/chat", "POST", { message });
  }

  uploadFoodPhoto(formData: FormData): Promise<{ success: true; id: string; status: "queued"; imageUrl: string }> {
    return this.request("/api/food", {
      method: "POST",
      body: formData,
    });
  }

  createManualFoodLog(payload: unknown) {
    return this.json<ApiResponse<FoodLog>>("/api/food/manual", "POST", payload);
  }

  getFoodLogs() {
    return this.request<ApiResponse<FoodLog[]>>("/api/food");
  }

  getFoodLog(id: string) {
    return this.request<ApiResponse<FoodLog>>(`/api/food/${id}`);
  }

  getFoodHistory(id: string) {
    return this.request<ApiResponse<Array<Record<string, unknown>>>>(`/api/food/${id}/history`);
  }

  updateFoodLog(id: string, payload: unknown) {
    return this.json<ApiResponse<FoodLog>>(`/api/food/${id}`, "PATCH", payload);
  }

  deleteFoodLog(id: string) {
    return this.request<{ success: true; message: string }>(`/api/food/${id}`, { method: "DELETE" });
  }

  uploadVoiceLog(formData: FormData) {
    return this.request<{ success: true; id: string; status: "queued"; audioUrl: string }>("/api/voice-logs", {
      method: "POST",
      body: formData,
    });
  }

  getVoiceLogs() {
    return this.request<ApiResponse<VoiceLog[]>>("/api/voice-logs");
  }

  getVoiceLog(id: string) {
    return this.request<ApiResponse<VoiceLog>>(`/api/voice-logs/${id}`);
  }

  getGoals() {
    return this.request<ApiResponse<NutritionGoals>>("/api/goals");
  }

  updateGoals(payload: NutritionGoals) {
    return this.json<ApiResponse<NutritionGoals>>("/api/goals", "PUT", payload);
  }

  getNutritionSummary(period: NutritionPeriod = "day") {
    return this.request<ApiResponse<NutritionSummary>>(`/api/goals/nutrition?period=${period}`);
  }

  getNutritionProgress(days = 30) {
    return this.request<ApiResponse<NutritionProgress>>(`/api/goals/progress?days=${days}`);
  }

  getGoalRecommendations(days = 14) {
    return this.request<ApiResponse<GoalRecommendationWindow>>(`/api/goals/recommendations?days=${days}`);
  }

  getAdherence(days = 7) {
    return this.request<ApiResponse<AdherenceSummary>>(`/api/goals/adherence?days=${days}`);
  }

  getDashboard(period: NutritionPeriod = "day") {
    return this.request<ApiResponse<DashboardData>>(`/api/dashboard/${period}`);
  }

  getWeeklyInsights() {
    return this.request<ApiResponse<{ from: string; to: string; insights: WeeklyInsight[] }>>(
      "/api/insights/weekly",
    );
  }

  createWaterLog(payload: { amountMl: number; loggedAt?: string }) {
    return this.json<ApiResponse<WaterLog>>("/api/water", "POST", payload);
  }

  getWaterLogs() {
    return this.request<ApiResponse<WaterLog[]>>("/api/water");
  }

  deleteWaterLog(id: string) {
    return this.request<{ success: true; message: string }>(`/api/water/${id}`, { method: "DELETE" });
  }

  createExerciseLog(payload: {
    activityType: string;
    durationMinutes: number;
    estimatedCaloriesBurned?: number | null;
    notes?: string;
    loggedAt?: string;
  }) {
    return this.json<ApiResponse<ExerciseLog>>("/api/exercise", "POST", payload);
  }

  getExerciseLogs() {
    return this.request<ApiResponse<ExerciseLog[]>>("/api/exercise");
  }

  deleteExerciseLog(id: string) {
    return this.request<{ success: true; message: string }>(`/api/exercise/${id}`, { method: "DELETE" });
  }

  createWeightLog(payload: { weightKg: number; notes?: string; loggedAt?: string }) {
    return this.json<ApiResponse<WeightLog>>("/api/weight", "POST", payload);
  }

  getWeightLogs() {
    return this.request<ApiResponse<WeightLog[]>>("/api/weight");
  }

  deleteWeightLog(id: string) {
    return this.request<{ success: true; message: string }>(`/api/weight/${id}`, { method: "DELETE" });
  }
}

export function createApiClient(baseUrl: string, options?: Omit<ApiClientOptions, "baseUrl">) {
  let extraHeaders: Record<string, string> = {};

  // Inject user's Gemini API key from localStorage if available (browser only)
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    const geminiKey = localStorage.getItem("wellify_gemini_key");
    if (geminiKey) {
      extraHeaders["x-gemini-api-key"] = geminiKey;
    }
  }

  return new ApiClient({
    baseUrl,
    ...options,
    headers: {
      ...extraHeaders,
      ...(options?.headers as Record<string, string> ?? {}),
    },
  });
}
