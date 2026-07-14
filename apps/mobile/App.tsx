import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { createApiClient } from "@health-tracker/api-client";
import type { AuthResponse, AuthUser } from "@health-tracker/api-client";
import { designTokens } from "@health-tracker/design-tokens";
import type {
  AdherenceSummary,
  ApiResponse,
  DashboardData,
  ExerciseLog,
  NutritionGoals,
  WeeklyInsight,
  WaterLog,
  WeightLog,
} from "@health-tracker/types";

type AuthMode = "sign_in" | "sign_up";
type Tab = "dashboard" | "meals" | "add" | "chat" | "progress";
type ComposerMode = "water" | "exercise" | "weight" | "log" | "chat";

const defaultBaseUrl = Platform.select({
  android: "http://10.0.2.2:3000",
  default: "http://localhost:3000",
});

function fmt(value?: number | null, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${Math.round(value * 10) / 10}${suffix}`;
}

function pct(current?: number | null, goal?: number | null): number {
  if (!current || !goal || goal === 0) return 0;
  return Math.min(Math.round((current / goal) * 100), 100);
}

function formatDate(value?: string) {
  if (!value) return "Just now";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

// ---------------------------------------------------------------------------
// Login Screen
// ---------------------------------------------------------------------------
function LoginScreen({
  baseUrl,
  onBaseUrlChange,
  onAuthenticated,
}: {
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  onAuthenticated: (user: AuthUser, token: string) => void;
}) {
  const [authMode, setAuthMode] = useState<AuthMode>("sign_in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showServerConfig, setShowServerConfig] = useState(false);

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) { setError("Email and password are required."); return; }
    if (authMode === "sign_up" && !name.trim()) { setError("Name is required for sign up."); return; }

    setLoading(true);
    setError(null);
    try {
      const client = createApiClient(baseUrl.trim(), { credentials: "include" });
      let result: AuthResponse;
      if (authMode === "sign_up") {
        result = await client.signUp({ email: trimmedEmail, password: trimmedPassword, name: name.trim() });
      } else {
        result = await client.signIn({ email: trimmedEmail, password: trimmedPassword });
      }
      onAuthenticated(result.user, result.session.token);
    } catch (err: unknown) {
      const apiErr = err as ApiResponse<unknown> | undefined;
      setError(apiErr?.error?.message ?? (authMode === "sign_up" ? "Sign up failed." : "Invalid credentials."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.loginContainer} keyboardShouldPersistTaps="handled">
          <View style={s.loginHero}>
            <View style={s.orbPrimary} />
            <View style={s.orbSecondary} />
            <Text style={s.brandText}>Wellify</Text>
            <Text style={s.kicker}>Restorative wellness, curated daily</Text>
            <Text style={s.loginTitle}>{authMode === "sign_in" ? "Welcome back." : "Begin your journey."}</Text>
            <Text style={s.loginSubtitle}>
              {authMode === "sign_in" ? "Sign in to your wellness dashboard." : "Create an account to start tracking."}
            </Text>
          </View>

          <View style={s.card}>
            <View style={s.tabRow}>
              <Pressable onPress={() => { setAuthMode("sign_in"); setError(null); }} style={[s.tab, authMode === "sign_in" && s.tabActive]}>
                <Text style={[s.tabLabel, authMode === "sign_in" && s.tabLabelActive]}>Sign In</Text>
              </Pressable>
              <Pressable onPress={() => { setAuthMode("sign_up"); setError(null); }} style={[s.tab, authMode === "sign_up" && s.tabActive]}>
                <Text style={[s.tabLabel, authMode === "sign_up" && s.tabLabelActive]}>Sign Up</Text>
              </Pressable>
            </View>

            {authMode === "sign_up" && (
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Name</Text>
                <TextInput autoCapitalize="words" onChangeText={setName} placeholder="Your name" placeholderTextColor="#72787560" style={s.input} value={name} />
              </View>
            )}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Email</Text>
              <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="name@example.com" placeholderTextColor="#72787560" style={s.input} value={email} />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Password</Text>
              <TextInput autoCapitalize="none" onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor="#72787560" secureTextEntry style={s.input} value={password} />
            </View>

            {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

            <Pressable disabled={loading} onPress={handleSubmit} style={s.primaryBtn}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={s.primaryBtnLabel}>{authMode === "sign_in" ? "Sign In" : "Create Account"}</Text>
              )}
            </Pressable>
          </View>

          <Pressable onPress={() => setShowServerConfig(!showServerConfig)}>
            <Text style={s.serverToggle}>{showServerConfig ? "Hide server settings" : "Server settings"}</Text>
          </Pressable>
          {showServerConfig && (
            <View style={s.card}>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Server URL</Text>
                <TextInput autoCapitalize="none" onChangeText={onBaseUrlChange} placeholder="http://localhost:3000" placeholderTextColor="#72787560" style={s.input} value={baseUrl} />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Nutrition Ring
// ---------------------------------------------------------------------------
function NutritionRing({ cals, calGoal, water, waterGoal }: { cals: number; calGoal: number; water: number; waterGoal: number }) {
  const size = 200;
  const cx = size / 2;
  const rOuter = 86;
  const rInner = 66;
  const circOuter = 2 * Math.PI * rOuter;
  const circInner = 2 * Math.PI * rInner;
  const calPct = calGoal > 0 ? Math.min(cals / calGoal, 1) : 0;
  const waterPct = waterGoal > 0 ? Math.min(water / waterGoal, 1) : 0;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={cx} cy={cx} r={rOuter} fill="transparent" stroke="#eae8e7" strokeWidth={14} />
        <Circle cx={cx} cy={cx} r={rOuter} fill="transparent" stroke="#4d6359" strokeWidth={14} strokeLinecap="round" strokeDasharray={`${circOuter}`} strokeDashoffset={`${circOuter * (1 - calPct)}`} />
        <Circle cx={cx} cy={cx} r={rInner} fill="transparent" stroke="#eae8e7" strokeWidth={14} />
        <Circle cx={cx} cy={cx} r={rInner} fill="transparent" stroke="#8ca398" strokeWidth={14} strokeLinecap="round" strokeDasharray={`${circInner}`} strokeDashoffset={`${circInner * (1 - waterPct)}`} />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontSize: 9, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: "#6a5c4d" }}>Calories</Text>
        <Text style={{ fontSize: 32, fontWeight: "800", color: "#4d6359", letterSpacing: -1.5 }}>{fmt(cals)}</Text>
        <Text style={{ fontSize: 10, color: "#a0a0a0" }}>/ {fmt(calGoal)} kcal</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Tab
// ---------------------------------------------------------------------------
function DashboardTab({ baseUrl, token, user, onSignOut }: { baseUrl: string; token: string; user: AuthUser; onSignOut: () => void }) {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [adherence, setAdherence] = useState<AdherenceSummary | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);

  const client = createApiClient(baseUrl.trim(), { credentials: "include", headers: { Authorization: `Bearer ${token}` } });

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [dashRes, adhRes, exRes, wtRes, insRes, goalsRes] = await Promise.all([
        client.getDashboard("day"), client.getAdherence(7), client.getExerciseLogs(),
        client.getWeightLogs(), client.getWeeklyInsights(), client.getGoals(),
      ]);
      setDashboard(dashRes.data ?? null);
      setAdherence(adhRes.data ?? null);
      setExerciseLogs(exRes.data ?? []);
      setWeightLogs(wtRes.data ?? []);
      setInsights(insRes.data?.insights ?? []);
      setGoals(goalsRes.data ?? null);
    } catch (err) {
      const apiErr = err as ApiResponse<unknown>;
      if (apiErr?.error?.code === "UNAUTHORIZED") onSignOut();
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#4d6359" size="large" /><Text style={s.loadingLabel}>Loading dashboard...</Text></View>;
  }

  const cals = dashboard?.totals.calories ?? 0;
  const calGoal = dashboard?.goals.calories ?? goals?.dailyCalories ?? 2200;
  const protein = dashboard?.totals.protein ?? 0;
  const proteinGoal = dashboard?.goals.protein ?? goals?.dailyProtein ?? 150;
  const carbs = dashboard?.totals.carbs ?? 0;
  const carbsGoal = dashboard?.goals.carbs ?? goals?.dailyCarbs ?? 250;
  const fat = dashboard?.totals.fat ?? 0;
  const fatGoal = dashboard?.goals.fat ?? goals?.dailyFat ?? 70;
  const water = dashboard?.totals.waterMl ?? 0;
  const waterGoal = 2000;
  const exerciseMin = dashboard?.totals.exerciseMinutes ?? 0;
  const latestWeight = dashboard?.latestWeightKg ?? weightLogs[0]?.weightKg ?? null;
  const latestExercise = exerciseLogs[0];
  const latestInsight = insights[0];

  const adhScore = adherence
    ? Math.round(((adherence.calorieGoalDaysHit + adherence.proteinGoalDaysHit + adherence.hydrationDaysHit + adherence.exerciseDaysHit) / (adherence.days * 4)) * 100)
    : 0;

  const prevWeight = weightLogs[1]?.weightKg;
  const weightDiff = latestWeight && prevWeight ? latestWeight - prevWeight : null;

  return (
    <ScrollView contentContainerStyle={s.dashScroll}>
      {/* Header */}
      <View style={s.headerBar}>
        <View style={s.headerLeft}>
          <View style={s.avatar}><Text style={s.avatarText}>{(user.name?.[0] ?? user.email[0]).toUpperCase()}</Text></View>
          <View>
            <Text style={s.headerGreeting}>Welcome back,</Text>
            <Text style={s.headerName}>{user.name || user.email}</Text>
          </View>
        </View>
        <Pressable onPress={onSignOut} style={s.signOutBtn}><Text style={s.signOutLabel}>Sign Out</Text></Pressable>
      </View>

      {/* Hero */}
      <View style={s.heroSection}>
        <Text style={s.heroKicker}>Today's Narrative</Text>
        <Text style={s.heroTitle}>Restore & Flourish.</Text>
      </View>

      {/* Nutrition Ring + Macros */}
      <View style={s.nutritionCard}>
        <NutritionRing cals={cals!} calGoal={calGoal!} water={water!} waterGoal={waterGoal} />
        <View style={s.macroGrid}>
          {([
            { label: "Protein", value: protein, goal: proteinGoal, unit: "g" },
            { label: "Carbs", value: carbs, goal: carbsGoal, unit: "g" },
            { label: "Fat", value: fat, goal: fatGoal, unit: "g" },
            { label: "Hydration", value: water, goal: waterGoal, unit: "ml" },
          ] as const).map((m) => (
            <View key={m.label} style={s.macroItem}>
              <Text style={s.macroLabel}>{m.label}</Text>
              <Text style={s.macroValue}>{fmt(m.value)}{m.unit}</Text>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${pct(m.value, m.goal)}%` }]} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Adherence + Exercise Row */}
      <View style={s.row}>
        <View style={s.adherenceCard}>
          <Text style={s.adherenceTitle}>{adhScore >= 80 ? "Elite" : adhScore >= 50 ? "Good" : "Building"}</Text>
          <Text style={s.adherenceDesc}>{adherence?.summaryText ?? "Keep logging!"}</Text>
          <Text style={s.adherenceScore}>{adhScore}%</Text>
          <View style={s.adherenceTrack}><View style={[s.adherenceFill, { width: `${adhScore}%` }]} /></View>
        </View>

        <View style={s.exerciseCard}>
          <Text style={s.miniLabel}>Movement</Text>
          <Text style={s.bigNumber}>{fmt(exerciseMin)}</Text>
          <Text style={s.bigUnit}>min</Text>
          <Text style={s.exerciseDetail}>{latestExercise ? `${latestExercise.activityType}` : "No activity"}</Text>
        </View>
      </View>

      {/* Weight + AI Insight Row */}
      <View style={s.row}>
        <View style={s.weightCard}>
          <Text style={s.miniLabel}>Weight</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text style={s.bigNumber}>{latestWeight ? latestWeight.toFixed(1) : "--"}</Text>
            <Text style={s.bigUnit}>kg</Text>
          </View>
          {weightDiff !== null && (
            <Text style={[s.weightDiff, { color: weightDiff <= 0 ? "#8ca398" : "#6a5c4d" }]}>
              {weightDiff <= 0 ? "↓" : "↑"} {Math.abs(weightDiff).toFixed(1)}kg
            </Text>
          )}
          <View style={s.sparkline}>
            {weightLogs.slice(0, 5).reverse().map((w, i) => (
              <View key={w.id} style={[s.sparkBar, { height: Math.max(12, Math.min(40, ((w.weightKg - 50) / 60) * 40)), backgroundColor: i === weightLogs.slice(0, 5).length - 1 ? "#8ca398" : "#eae8e7" }]} />
            ))}
          </View>
        </View>

        <View style={s.insightCard}>
          <Text style={s.insightLabel}>AI Insight</Text>
          <Text style={s.insightText}>
            {latestInsight ? `"${latestInsight.message}"` : "\"Log a few more days for personalized insights.\""}
          </Text>
        </View>
      </View>

      {/* Objectives */}
      <Text style={s.sectionTitle}>Active Objectives</Text>
      {([
        { emoji: "💧", label: "Hydration", score: pct(water, waterGoal) },
        { emoji: "⚡", label: "Energy Balance", score: pct(cals, calGoal) },
        { emoji: "💪", label: "Protein Target", score: pct(protein, proteinGoal) },
      ] as const).map((g) => (
        <View key={g.label} style={s.goalRow}>
          <View style={s.goalIcon}><Text style={{ fontSize: 20 }}>{g.emoji}</Text></View>
          <View style={{ flex: 1 }}>
            <View style={s.goalHeader}>
              <Text style={s.goalLabel}>{g.label}</Text>
              <Text style={s.goalPct}>{g.score}%</Text>
            </View>
            <View style={s.goalTrack}><View style={[s.goalFill, { width: `${g.score}%` }]} /></View>
          </View>
        </View>
      ))}

      <Pressable onPress={() => void loadData()} style={s.refreshBtn}>
        <Text style={s.refreshBtnLabel}>Refresh</Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Quick Add Tab
// ---------------------------------------------------------------------------
function AddTab({ baseUrl, token }: { baseUrl: string; token: string }) {
  const [composerMode, setComposerMode] = useState<ComposerMode>("water");
  const [submitting, setSubmitting] = useState(false);
  const [waterAmount, setWaterAmount] = useState("350");
  const [exerciseType, setExerciseType] = useState("Walk");
  const [exerciseMinutes, setExerciseMinutes] = useState("25");
  const [exerciseCalories, setExerciseCalories] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [reflectionText, setReflectionText] = useState("");
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const client = createApiClient(baseUrl.trim(), { credentials: "include", headers: { Authorization: `Bearer ${token}` } });

  async function submit() {
    setSubmitting(true); setSuccessMsg(null);
    try {
      if (composerMode === "water") {
        const ml = Number(waterAmount);
        if (!ml || ml <= 0) { Alert.alert("Error", "Enter a valid amount."); return; }
        await client.createWaterLog({ amountMl: ml }); setWaterAmount("350"); setSuccessMsg("Water logged!");
      } else if (composerMode === "exercise") {
        const dur = Number(exerciseMinutes);
        if (!exerciseType.trim() || !dur) { Alert.alert("Error", "Enter activity and duration."); return; }
        await client.createExerciseLog({ activityType: exerciseType.trim(), durationMinutes: dur, estimatedCaloriesBurned: exerciseCalories.trim() ? Number(exerciseCalories) : undefined });
        setExerciseCalories(""); setSuccessMsg("Exercise logged!");
      } else if (composerMode === "weight") {
        const val = Number(weightKg);
        if (!val || val <= 0) { Alert.alert("Error", "Enter a valid weight."); return; }
        await client.createWeightLog({ weightKg: val }); setWeightKg(""); setSuccessMsg("Weight logged!");
      } else if (composerMode === "log") {
        if (!reflectionText.trim()) { Alert.alert("Error", "Write something first."); return; }
        await client.createLog(reflectionText.trim()); setReflectionText(""); setSuccessMsg("Reflection saved!");
      } else if (composerMode === "chat") {
        if (!chatPrompt.trim()) { Alert.alert("Error", "Ask something first."); return; }
        const res = await client.createChat(chatPrompt.trim()); setChatAnswer(res.answer);
      }
    } catch (err) {
      const apiErr = err as ApiResponse<unknown>;
      Alert.alert("Error", apiErr?.error?.message ?? "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.addScroll} keyboardShouldPersistTaps="handled">
      <Text style={s.heroTitle}>Quick Add</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
        {(["water", "exercise", "weight", "log", "chat"] as ComposerMode[]).map((mode) => (
          <Pressable key={mode} onPress={() => { setComposerMode(mode); setSuccessMsg(null); setChatAnswer(null); }} style={[s.pill, composerMode === mode && s.pillActive]}>
            <Text style={[s.pillLabel, composerMode === mode && s.pillLabelActive]}>{mode === "log" ? "reflection" : mode}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={s.card}>
        {composerMode === "water" && (
          <View style={s.inputGroup}><Text style={s.inputLabel}>Amount (ml)</Text>
            <TextInput keyboardType="numeric" onChangeText={setWaterAmount} placeholder="350" placeholderTextColor="#72787560" style={s.input} value={waterAmount} /></View>
        )}
        {composerMode === "exercise" && (<>
          <View style={s.inputGroup}><Text style={s.inputLabel}>Activity</Text><TextInput onChangeText={setExerciseType} placeholder="Walk" placeholderTextColor="#72787560" style={s.input} value={exerciseType} /></View>
          <View style={s.inputGroup}><Text style={s.inputLabel}>Minutes</Text><TextInput keyboardType="numeric" onChangeText={setExerciseMinutes} placeholder="25" placeholderTextColor="#72787560" style={s.input} value={exerciseMinutes} /></View>
          <View style={s.inputGroup}><Text style={s.inputLabel}>Calories burned (optional)</Text><TextInput keyboardType="numeric" onChangeText={setExerciseCalories} placeholder="Optional" placeholderTextColor="#72787560" style={s.input} value={exerciseCalories} /></View>
        </>)}
        {composerMode === "weight" && (
          <View style={s.inputGroup}><Text style={s.inputLabel}>Weight (kg)</Text>
            <TextInput keyboardType="decimal-pad" onChangeText={setWeightKg} placeholder="72.4" placeholderTextColor="#72787560" style={s.input} value={weightKg} /></View>
        )}
        {composerMode === "log" && (
          <View style={s.inputGroup}><Text style={s.inputLabel}>Daily reflection</Text>
            <TextInput multiline onChangeText={setReflectionText} placeholder="How are you feeling today?" placeholderTextColor="#72787560" style={[s.input, { minHeight: 100, paddingTop: 14, textAlignVertical: "top" }]} value={reflectionText} /></View>
        )}
        {composerMode === "chat" && (<>
          <View style={s.inputGroup}><Text style={s.inputLabel}>Ask your coach</Text>
            <TextInput multiline onChangeText={setChatPrompt} placeholder="What patterns do you see?" placeholderTextColor="#72787560" style={[s.input, { minHeight: 100, paddingTop: 14, textAlignVertical: "top" }]} value={chatPrompt} /></View>
          {chatAnswer && <View style={s.answerBox}><Text style={s.answerLabel}>Coach reply</Text><Text style={s.answerText}>{chatAnswer}</Text></View>}
        </>)}

        {successMsg && <Text style={s.successText}>{successMsg}</Text>}

        <Pressable disabled={submitting} onPress={() => void submit()} style={s.primaryBtn}>
          <Text style={s.primaryBtnLabel}>{submitting ? "Saving..." : "Submit"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Placeholder Tabs
// ---------------------------------------------------------------------------
function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <View style={s.center}>
      <Text style={s.heroTitle}>{title}</Text>
      <Text style={[s.loadingLabel, { marginTop: 8, textAlign: "center", paddingHorizontal: 40 }]}>{description}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bottom Tab Bar
// ---------------------------------------------------------------------------
function BottomTabBar({ active, onChangeTab }: { active: Tab; onChangeTab: (tab: Tab) => void }) {
  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: "dashboard", label: "Dashboard", emoji: "▣" },
    { key: "meals", label: "Meals", emoji: "🍽" },
    { key: "add", label: "Add", emoji: "+" },
    { key: "chat", label: "Chat", emoji: "💬" },
    { key: "progress", label: "Progress", emoji: "📊" },
  ];

  return (
    <View style={s.bottomBar}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        const isAdd = t.key === "add";
        return (
          <Pressable key={t.key} onPress={() => onChangeTab(t.key)} style={[s.bottomTab, isAdd && s.bottomTabAdd]}>
            {isAdd ? (
              <View style={s.fabButton}><Text style={s.fabText}>+</Text></View>
            ) : (
              <Text style={[s.bottomEmoji, isActive && s.bottomEmojiActive]}>{t.emoji}</Text>
            )}
            <Text style={[s.bottomLabel, isActive && s.bottomLabelActive, isAdd && s.bottomLabelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main App (authenticated)
// ---------------------------------------------------------------------------
function MainApp({ baseUrl, user, token, onSignOut }: { baseUrl: string; user: AuthUser; token: string; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        {activeTab === "dashboard" && <DashboardTab baseUrl={baseUrl} token={token} user={user} onSignOut={onSignOut} />}
        {activeTab === "meals" && <PlaceholderTab title="Meals" description="Meal logging and food photo analysis coming soon." />}
        {activeTab === "add" && <AddTab baseUrl={baseUrl} token={token} />}
        {activeTab === "chat" && <PlaceholderTab title="AI Coach" description="Chat with your wellness coach coming soon." />}
        {activeTab === "progress" && <PlaceholderTab title="Progress" description="Weekly insights and progress tracking coming soon." />}
      </View>
      <BottomTabBar active={activeTab} onChangeTab={setActiveTab} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
export default function App() {
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl ?? "http://localhost:3000");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  function handleAuth(authUser: AuthUser, token: string) { setUser(authUser); setSessionToken(token); }
  function handleSignOut() {
    if (sessionToken) {
      const client = createApiClient(baseUrl.trim(), { credentials: "include", headers: { Authorization: `Bearer ${sessionToken}` } });
      client.signOut().catch(() => {});
    }
    setUser(null); setSessionToken(null);
  }

  if (!user || !sessionToken) {
    return <LoginScreen baseUrl={baseUrl} onBaseUrlChange={setBaseUrl} onAuthenticated={handleAuth} />;
  }

  return <MainApp baseUrl={baseUrl} user={user} token={sessionToken} onSignOut={handleSignOut} />;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const C = {
  bg: "#fbf9f8",
  surfLow: "#f6f3f2",
  surfHigh: "#eae8e7",
  surfHighest: "#e4e2e1",
  primary: "#4d6359",
  primaryCont: "#8ca398",
  primaryFixed: "#d0e8dc",
  secondary: "#6a5c4d",
  secondaryCont: "#f0dcc9",
  text: "#1b1c1c",
  muted: "#424845",
  outline: "#727875",
  white: "#ffffff",
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Login
  loginContainer: { padding: 20, paddingBottom: 40, gap: 20, justifyContent: "center", flexGrow: 1 },
  loginHero: { position: "relative", overflow: "hidden", padding: 24, borderRadius: 28, backgroundColor: C.surfLow, gap: 10 },
  loginTitle: { color: C.text, fontSize: 28, fontWeight: "800", letterSpacing: -1 },
  loginSubtitle: { color: C.muted, fontSize: 14, lineHeight: 20 },
  serverToggle: { color: C.muted, fontSize: 13, fontWeight: "600", textAlign: "center", textDecorationLine: "underline" },

  // Shared
  brandText: { color: C.primary, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  kicker: { color: C.primary, fontSize: 10, fontWeight: "800", letterSpacing: 2.4, textTransform: "uppercase" },
  orbPrimary: { position: "absolute", right: -48, bottom: -52, width: 180, height: 180, borderRadius: 999, backgroundColor: "rgba(208,232,220,0.7)" },
  orbSecondary: { position: "absolute", top: -18, right: 72, width: 120, height: 120, borderRadius: 999, backgroundColor: "rgba(243,223,204,0.75)" },

  card: { padding: 18, borderRadius: 20, backgroundColor: C.white, gap: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 2 },
  tabRow: { flexDirection: "row", borderRadius: 999, backgroundColor: C.surfLow, padding: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 999 },
  tabActive: { backgroundColor: C.white, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  tabLabel: { color: C.muted, fontSize: 13, fontWeight: "700" },
  tabLabelActive: { color: C.primary },
  inputGroup: { gap: 6 },
  inputLabel: { paddingLeft: 4, color: C.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.8, textTransform: "uppercase" },
  input: { borderRadius: 14, backgroundColor: C.surfLow, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15 },
  errorBox: { padding: 12, borderRadius: 12, backgroundColor: "#ffdad6" },
  errorText: { color: "#ba1a1a", fontSize: 13 },
  primaryBtn: { marginTop: 4, borderRadius: 999, backgroundColor: C.primary, paddingVertical: 16, alignItems: "center" },
  primaryBtnLabel: { color: C.white, fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },

  // Dashboard
  dashScroll: { padding: 20, paddingBottom: 100, gap: 16 },
  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryFixed, alignItems: "center", justifyContent: "center" },
  avatarText: { color: C.primary, fontWeight: "800", fontSize: 16 },
  headerGreeting: { color: C.muted, fontSize: 12 },
  headerName: { color: C.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  signOutBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.surfHigh },
  signOutLabel: { color: C.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },

  heroSection: { gap: 4 },
  heroKicker: { fontSize: 10, fontWeight: "800", letterSpacing: 2.4, textTransform: "uppercase", color: C.secondary },
  heroTitle: { fontSize: 34, fontWeight: "800", letterSpacing: -1.5, color: C.primary },

  nutritionCard: { backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 28, padding: 20, alignItems: "center", gap: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 24, elevation: 2 },
  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, width: "100%" },
  macroItem: { width: "46%", gap: 4 },
  macroLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: C.secondary },
  macroValue: { fontSize: 22, fontWeight: "800", color: C.primary, letterSpacing: -0.5 },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: C.surfHighest, marginTop: 4 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: C.primary },

  row: { flexDirection: "row", gap: 12 },
  adherenceCard: { flex: 1, borderRadius: 24, padding: 18, backgroundColor: C.primary, gap: 8 },
  adherenceTitle: { color: C.white, fontSize: 20, fontWeight: "800" },
  adherenceDesc: { color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 17 },
  adherenceScore: { color: C.white, fontSize: 28, fontWeight: "800", marginTop: 4 },
  adherenceTrack: { height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)" },
  adherenceFill: { height: "100%", borderRadius: 999, backgroundColor: C.white },

  exerciseCard: { flex: 1, borderRadius: 24, padding: 18, backgroundColor: C.surfLow, gap: 2 },
  miniLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: C.secondary },
  bigNumber: { fontSize: 34, fontWeight: "800", color: C.primary, letterSpacing: -1 },
  bigUnit: { fontSize: 14, fontWeight: "700", color: C.outline },
  exerciseDetail: { fontSize: 12, color: C.outline, fontStyle: "italic", marginTop: 4 },

  weightCard: { flex: 1, borderRadius: 24, padding: 18, backgroundColor: C.surfLow, gap: 4 },
  weightDiff: { fontSize: 12, fontWeight: "700" },
  sparkline: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 8 },
  sparkBar: { width: 6, borderRadius: 999 },

  insightCard: { flex: 1, borderRadius: 24, padding: 18, backgroundColor: C.secondaryCont, gap: 8 },
  insightLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: C.secondary },
  insightText: { fontSize: 14, fontWeight: "500", color: C.secondary, lineHeight: 20, fontStyle: "italic" },

  sectionTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5, color: C.primary, marginTop: 8 },

  goalRow: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.surfLow, borderRadius: 16, padding: 16 },
  goalIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.white, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  goalLabel: { fontWeight: "700", fontSize: 14, color: C.primary },
  goalPct: { fontSize: 12, fontWeight: "700", color: C.outline },
  goalTrack: { height: 5, borderRadius: 999, backgroundColor: C.white },
  goalFill: { height: "100%", borderRadius: 999, backgroundColor: C.primary },

  refreshBtn: { borderRadius: 999, backgroundColor: C.surfHigh, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  refreshBtnLabel: { color: C.primary, fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },

  // Quick Add
  addScroll: { padding: 20, paddingBottom: 100, gap: 12 },
  pill: { marginRight: 10, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: C.surfHigh },
  pillActive: { backgroundColor: C.primaryFixed, transform: [{ scale: 1.05 }] },
  pillLabel: { color: C.muted, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  pillLabelActive: { color: C.primary },
  answerBox: { padding: 14, borderRadius: 14, backgroundColor: C.surfLow, gap: 6 },
  answerLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: C.primary },
  answerText: { fontSize: 14, color: C.text, lineHeight: 20 },
  successText: { color: C.primary, fontWeight: "700", fontSize: 13, textAlign: "center" },

  // Bottom Bar
  bottomBar: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingTop: 8, paddingBottom: 28, backgroundColor: "rgba(255,255,255,0.88)", borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 8 },
  bottomTab: { alignItems: "center", gap: 4 },
  bottomTabAdd: { marginTop: -28 },
  fabButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fabText: { color: C.white, fontSize: 26, fontWeight: "700", marginTop: -2 },
  bottomEmoji: { fontSize: 20, opacity: 0.4 },
  bottomEmojiActive: { opacity: 1 },
  bottomLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", color: C.outline, opacity: 0.5 },
  bottomLabelActive: { color: C.primary, opacity: 1 },

  // Shared
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingLabel: { color: C.muted, fontSize: 13, fontWeight: "600" },
});
