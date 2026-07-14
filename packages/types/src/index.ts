export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type GoalType = "lose" | "maintain" | "gain";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type NutritionPeriod = "day" | "week";

export interface DetectedFood {
  name: string;
  estimatedPortion: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  confidence: number | null;
}

export interface FoodLog {
  id: string;
  title?: string | null;
  entryMode: "photo" | "manual" | "hybrid";
  mealType?: MealType | null;
  notes?: string | null;
  imageUrl?: string | null;
  status: "pending" | "completed" | "failed";
  totalCalories?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
  detectedFoods?: DetectedFood[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoiceLog {
  id: string;
  audioUrl?: string | null;
  transcript?: string | null;
  status: "pending" | "completed" | "failed";
  createdLogEntryId?: string | null;
  createdAt?: string;
}

export interface NutritionGoals {
  dailyCalories?: number | null;
  dailyProtein?: number | null;
  dailyCarbs?: number | null;
  dailyFat?: number | null;
  goalType?: GoalType | null;
  activityLevel?: ActivityLevel | null;
}

export interface WeeklyInsight {
  type: "protein" | "hydration" | "calories" | "exercise" | "logging" | "weight";
  title: string;
  message: string;
  severity: "info" | "warning" | "positive";
}

export interface GoalRecommendation {
  suggestedCalories: number | null;
  suggestedProtein: number | null;
  suggestedCarbs: number | null;
  suggestedFat: number | null;
  reasoning: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
  };
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface LogCreateResponse {
  success: true;
  id: string;
  status: "queued";
  message: string;
}

export interface ChatDebug {
  factsUsed: number;
  logsUsed: number;
  hasSummary: boolean;
  verification: string;
}

export interface ChatResponse {
  success: true;
  answer: string;
  debug: ChatDebug;
}

export interface NutritionSummaryTotals {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  breakfastCalories?: number;
  lunchCalories?: number;
  dinnerCalories?: number;
  snackCalories?: number;
}

export interface NutritionSummaryAveragePerDay {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionSummary {
  period: NutritionPeriod;
  from: string;
  to: string;
  totals: NutritionSummaryTotals;
  averagePerDay: NutritionSummaryAveragePerDay;
  goalTargets: {
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  };
  summaries: Array<Record<string, unknown>>;
}

export interface NutritionProgressPoint {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goalCalories?: number | null;
  goalProtein?: number | null;
  goalCarbs?: number | null;
  goalFat?: number | null;
}

export interface NutritionProgress {
  from: string;
  to: string;
  days: number;
  points: NutritionProgressPoint[];
}

export interface GoalRecommendationWindow {
  from: string;
  to: string;
  recommendation: GoalRecommendation;
}

export interface DashboardDayBreakdown {
  date: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  waterMl?: number | null;
  exerciseMinutes?: number | null;
  caloriesBurned?: number | null;
  weightKg?: number | null;
}

export interface DashboardData {
  period: NutritionPeriod;
  from: string;
  to: string;
  goals: {
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  };
  totals: {
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    waterMl?: number | null;
    exerciseMinutes?: number | null;
    caloriesBurned?: number | null;
  };
  latestWeightKg?: number | null;
  days: DashboardDayBreakdown[];
}

export interface AdherenceSummary {
  days: number;
  calorieGoalDaysHit: number;
  proteinGoalDaysHit: number;
  hydrationDaysHit: number;
  exerciseDaysHit: number;
  loggingDaysHit: number;
  summaryText: string;
}

export interface WaterLog {
  id: string;
  amountMl: number;
  loggedAt: string;
  createdAt?: string;
}

export interface ExerciseLog {
  id: string;
  activityType: string;
  durationMinutes: number;
  estimatedCaloriesBurned?: number | null;
  notes?: string | null;
  loggedAt: string;
  createdAt?: string;
}

export interface WeightLog {
  id: string;
  weightKg: number;
  notes?: string | null;
  loggedAt: string;
  createdAt?: string;
}
