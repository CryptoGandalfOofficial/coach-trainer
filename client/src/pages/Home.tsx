import { useEffect, useMemo, useRef, useState } from "react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  Check,
  Clock3,
  Download,
  Globe2,
  LoaderCircle,
  MessageSquare,
  RotateCcw,
  Save,
  Settings2,
  Share2,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import {
  boundedWindowStart,
  calculateSwipeSteps,
  confidenceForSampleSize,
  easeOutCubic,
  swipeDirection,
  undoRangePayload,
} from "@/lib/chartInteractions";

type Goal = "tech-interview" | "behavioral" | "system-design";
type Timeline = "3-days" | "1-week" | "2-weeks" | "1-month" | "3-months";
type ProfileDraft = {
  preferredLanguage: string;
  country: string;
  targetRole: string;
  experienceLevel: string;
  weeklyMinutes: number;
  preferredModuleDifficulty:
    | "beginner"
    | "intermediate"
    | "advanced"
    | "expert";
  preferredModuleDuration: number;
};
type TargetStandardDraft = {
  outcomeType: string;
  targetName: string;
  evaluator: string;
  jurisdiction: string;
  targetDate: string;
  language: string;
  format: string;
  sourceUrl: string;
  notes: string;
};

const goals: Array<{
  id: Goal;
  title: string;
  description: string;
  icon: typeof BrainCircuit;
  tag?: string;
}> = [
  {
    id: "tech-interview",
    title: "Technical interview",
    description: "Algorithms, coding, and engineering judgment",
    icon: BrainCircuit,
    tag: "Popular",
  },
  {
    id: "behavioral",
    title: "Behavioral interview",
    description: "Stories, leadership, and communication",
    icon: MessageSquare,
  },
  {
    id: "system-design",
    title: "System design",
    description: "Architecture, scale, and trade-offs",
    icon: Target,
    tag: "Advanced",
  },
];
const timelines: Array<{
  id: Timeline;
  title: string;
  detail: string;
  color: string;
}> = [
  {
    id: "3-days",
    title: "3 days",
    detail: "Emergency sprint",
    color: "bg-rose-500",
  },
  { id: "1-week", title: "1 week", detail: "Intensive", color: "bg-amber-500" },
  {
    id: "2-weeks",
    title: "2 weeks",
    detail: "Focused",
    color: "bg-yellow-400",
  },
  {
    id: "1-month",
    title: "1 month",
    detail: "Comprehensive",
    color: "bg-emerald-500",
  },
  {
    id: "3-months",
    title: "3+ months",
    detail: "Mastery",
    color: "bg-sky-500",
  },
];
const features = [
  {
    icon: Timer,
    title: "Dynamic calibration",
    text: "Your plan changes with your deadline, performance, and available energy.",
  },
  {
    icon: Globe2,
    title: "Global context",
    text: "Practice with respectful guidance for different cultures, roles, and jurisdictions.",
  },
  {
    icon: TrendingUp,
    title: "Feedback that compounds",
    text: "Every answer becomes a sharper next question and a more useful next step.",
  },
];

const emptyProfile: ProfileDraft = {
  preferredLanguage: "en",
  country: "",
  targetRole: "",
  experienceLevel: "",
  weeklyMinutes: 300,
  preferredModuleDifficulty: "intermediate",
  preferredModuleDuration: 30,
};
const emptyTargetStandard: TargetStandardDraft = {
  outcomeType: "job-interview",
  targetName: "",
  evaluator: "",
  jurisdiction: "",
  targetDate: "",
  language: "en",
  format: "",
  sourceUrl: "",
  notes: "",
};

export default function Home() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [session, setSession] = useState<{
    sessionId: number;
    sessions: number;
    focus: string;
    difficulty: string;
    mode: string;
    interviewType: Goal;
    timeline: Timeline;
  } | null>(null);
  const [question, setQuestion] = useState<JsonQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<JsonFeedback | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfile);
  const [targetStandardDraft, setTargetStandardDraft] =
    useState<TargetStandardDraft>(emptyTargetStandard);
  const [peerFilters, setPeerFilters] = useState({
    role: "",
    country: "",
    experienceLevel: "",
  });
  const [modulePrefs, setModulePrefs] = useState<
    Record<
      string,
      {
        difficulty: "beginner" | "intermediate" | "advanced" | "expert";
        duration: number;
      }
    >
  >({});
  const [trendRange, setTrendRange] = useState<"4" | "8" | "custom">("8");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [rangeName, setRangeName] = useState("");
  const [editingRangeName, setEditingRangeName] = useState("");
  const [outcomeHistoryId, setOutcomeHistoryId] = useState("");
  const [actualOutcome, setActualOutcome] = useState<"passed" | "not-passed">(
    "passed"
  );
  const [actualScore, setActualScore] = useState("");
  const chartRef = useRef<HTMLDivElement>(null);
  const deletedRangeRef = useRef<{
    name: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  const { user, isAuthenticated } = useAuth();
  const progressQuery = trpc.profile.progress.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const targetStandardQuery = trpc.profile.targetStandard.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const targetStandardVersions = trpc.profile.targetStandardVersions.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: false }
  );
  const targetSources = trpc.profile.targetSources.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const targetSourceReviewHistory =
    trpc.profile.targetSourceReviewHistory.useQuery(undefined, {
      enabled: isAuthenticated,
      retry: false,
    });
  const readinessScore = trpc.profile.readinessScore.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const readinessHistory = trpc.profile.readinessScoreHistory.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: false }
  );
  const forecastAccuracy = trpc.profile.forecastAccuracy.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const weeklySummary = trpc.profile.weeklySummary.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const comparisonInput = useMemo(
    () => ({
      role: peerFilters.role || undefined,
      country: peerFilters.country || undefined,
      experienceLevel: peerFilters.experienceLevel || undefined,
      startDate:
        trendRange === "custom" && customStartDate
          ? customStartDate
          : undefined,
      endDate:
        trendRange === "custom" && customEndDate ? customEndDate : undefined,
    }),
    [peerFilters, trendRange, customStartDate, customEndDate]
  );
  const weeklyComparison = trpc.profile.weeklyComparison.useQuery(
    comparisonInput,
    { enabled: isAuthenticated, retry: false }
  );
  const savedDateRanges = trpc.profile.savedDateRanges.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const saveDateRange = trpc.profile.saveDateRange.useMutation({
    onSuccess: () => {
      void savedDateRanges.refetch();
      toast.success("Date range saved");
      setRangeName("");
      setEditingRangeName("");
    },
  });
  const updateSavedDateRange = trpc.profile.updateDateRange.useMutation({
    onSuccess: () => {
      void savedDateRanges.refetch();
      toast.success("Date range updated");
      setRangeName("");
      setEditingRangeName("");
    },
  });
  const deleteSavedDateRange = trpc.profile.deleteDateRange.useMutation({
    onSuccess: () => {
      void savedDateRanges.refetch();
      toast("Date range deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            const deleted = deletedRangeRef.current;
            if (deleted) saveDateRange.mutate(deleted);
          },
        },
      });
    },
  });
  const generateWeeklySummary = trpc.profile.generateWeeklySummary.useMutation({
    onSuccess: () => void weeklySummary.refetch(),
  });
  const analyticsSummary = trpc.analytics.summary.useQuery(undefined, {
    enabled: user?.role === "admin",
    retry: false,
  });
  const sourceRefreshStatus = trpc.scheduled.sourceRefreshStatus.useQuery(
    undefined,
    { enabled: user?.role === "admin", retry: false }
  );
  const sourceRefreshRuns = trpc.scheduled.sourceRefreshRuns.useQuery(
    { limit: 12 },
    { enabled: user?.role === "admin", retry: false }
  );
  const profileSave = trpc.profile.save.useMutation({
    onSuccess: () => void progressQuery.refetch(),
  });
  const targetStandardSave = trpc.profile.saveTargetStandard.useMutation({
    onSuccess: () => {
      void targetStandardQuery.refetch();
      void targetStandardVersions.refetch();
      void readinessScore.refetch();
      void readinessHistory.refetch();
      toast.success("Target Standard saved");
    },
    onError: error => toast.error(error.message),
  });
  const ingestSource = trpc.profile.ingestTargetSource.useMutation({
    onSuccess: () => {
      void targetSources.refetch();
      toast.success("Official source captured for review");
    },
    onError: error => toast.error(error.message),
  });
  const reviewSource = trpc.profile.reviewTargetSource.useMutation({
    onSuccess: () => {
      void targetSources.refetch();
      void targetSourceReviewHistory.refetch();
      toast.success("Source review updated");
    },
    onError: error => toast.error(error.message),
  });
  const recordReadinessOutcome =
    trpc.profile.recordReadinessOutcome.useMutation({
      onSuccess: () => {
        void forecastAccuracy.refetch();
        toast.success("Forecast outcome recorded");
      },
      onError: error => toast.error(error.message),
    });
  const start = trpc.coach.start.useMutation({
    onSuccess: data => {
      setSession(data);
      setStartedAt(Date.now());
      void progressQuery.refetch();
    },
  });
  const generate = trpc.coach.question.useMutation({
    onSuccess: data => {
      setQuestion(data);
      setFeedback(null);
      setAnswer("");
      setStartedAt(Date.now());
    },
  });
  const evaluate = trpc.coach.evaluate.useMutation({
    onSuccess: data => {
      setFeedback(data);
      void progressQuery.refetch();
      void readinessScore.refetch();
      void readinessHistory.refetch();
      void forecastAccuracy.refetch();
    },
  });

  useEffect(() => {
    const profile = progressQuery.data?.profile;
    if (profile) {
      setProfileDraft({
        preferredLanguage: profile.preferredLanguage || "en",
        country: profile.country || "",
        targetRole: profile.targetRole || "",
        experienceLevel: profile.experienceLevel || "",
        weeklyMinutes: profile.weeklyMinutes || 300,
        preferredModuleDifficulty:
          (profile.preferredModuleDifficulty as ProfileDraft["preferredModuleDifficulty"]) ||
          "intermediate",
        preferredModuleDuration: profile.preferredModuleDuration || 30,
      });
      setModulePrefs(current =>
        Object.keys(current).length
          ? current
          : {
              _default: {
                difficulty:
                  (profile.preferredModuleDifficulty as ProfileDraft["preferredModuleDifficulty"]) ||
                  "intermediate",
                duration: profile.preferredModuleDuration || 30,
              },
            }
      );
    }
  }, [progressQuery.data?.profile]);

  useEffect(() => {
    const standard = targetStandardQuery.data;
    if (standard) {
      setTargetStandardDraft({
        outcomeType: standard.outcomeType,
        targetName: standard.targetName,
        evaluator: standard.evaluator || "",
        jurisdiction: standard.jurisdiction || "",
        targetDate: standard.targetDate
          ? new Date(standard.targetDate).toISOString().slice(0, 10)
          : "",
        language: standard.language || "en",
        format: standard.format || "",
        sourceUrl: standard.sourceUrl || "",
        notes: standard.notes || "",
      });
    }
  }, [targetStandardQuery.data]);

  const selectedGoal = useMemo(
    () => goals.find(item => item.id === goal),
    [goal]
  );
  const selectedTimeline = useMemo(
    () => timelines.find(item => item.id === timeline),
    [timeline]
  );
  const updateProfile = (key: keyof ProfileDraft, value: string | number) =>
    setProfileDraft(current => ({ ...current, [key]: value }));
  const updateTargetStandard = (
    key: keyof TargetStandardDraft,
    value: string
  ) => setTargetStandardDraft(current => ({ ...current, [key]: value }));

  function saveProfile() {
    profileSave.mutate(profileDraft);
  }
  function saveTargetStandard() {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    if (!targetStandardDraft.targetName.trim()) {
      toast.error("Add the name of the interview, exam, or assessment first");
      return;
    }
    targetStandardSave.mutate({
      ...targetStandardDraft,
      targetName: targetStandardDraft.targetName.trim(),
      evaluator: targetStandardDraft.evaluator || undefined,
      jurisdiction: targetStandardDraft.jurisdiction || undefined,
      targetDate: targetStandardDraft.targetDate || undefined,
      format: targetStandardDraft.format || undefined,
      sourceUrl: targetStandardDraft.sourceUrl || undefined,
      notes: targetStandardDraft.notes || undefined,
      changeNote: "Updated from the Target Standard intake",
    });
  }
  function captureOfficialSource() {
    if (!targetStandardDraft.sourceUrl.trim()) {
      toast.error("Add an official source URL first");
      return;
    }
    ingestSource.mutate({
      url: targetStandardDraft.sourceUrl.trim(),
      jurisdiction: targetStandardDraft.jurisdiction || undefined,
      sourceType: "official",
    });
  }
  function acceptModule(module: RecommendedModule) {
    const interviewType: Goal =
      module.skill === "behavioral" ||
      module.skill === "system-design" ||
      module.skill === "tech-interview"
        ? module.skill
        : goal || "tech-interview";
    const preference = modulePrefs[module.title] ||
      modulePrefs._default || {
        difficulty: profileDraft.preferredModuleDifficulty,
        duration: profileDraft.preferredModuleDuration,
      };
    setGoal(interviewType);
    setTimeline("1-week");
    profileSave.mutate({
      ...profileDraft,
      targetRole: profileDraft.targetRole || selectedGoal?.title,
    });
    start.mutate({
      interviewType,
      timeline: "1-week",
      difficultyOverride: preference.difficulty,
      durationMinutes: preference.duration,
    });
  }
  function setModulePreference(
    title: string,
    key: "difficulty" | "duration",
    value: string
  ) {
    const nextValue = key === "duration" ? Number(value) : value;
    setModulePrefs(current => ({
      ...current,
      [title]: {
        ...(current[title] ||
          modulePrefs._default || { difficulty: "intermediate", duration: 30 }),
        [key]: nextValue,
      } as {
        difficulty: "beginner" | "intermediate" | "advanced" | "expert";
        duration: number;
      },
    }));
    if (key === "difficulty") {
      setProfileDraft(current => ({
        ...current,
        preferredModuleDifficulty:
          value as ProfileDraft["preferredModuleDifficulty"],
      }));
      profileSave.mutate({
        preferredModuleDifficulty:
          value as ProfileDraft["preferredModuleDifficulty"],
      });
    } else {
      setProfileDraft(current => ({
        ...current,
        preferredModuleDuration: Number(value),
      }));
      profileSave.mutate({ preferredModuleDuration: Number(value) });
    }
  }
  function saveNamedRange() {
    if (!rangeName.trim() || !customStartDate || !customEndDate) {
      toast.error("Add a name, start date, and end date first");
      return;
    }
    if (customStartDate > customEndDate) {
      toast.error("Start date must be before end date");
      return;
    }
    const input = {
      name: rangeName.trim(),
      startDate: customStartDate,
      endDate: customEndDate,
    };
    if (editingRangeName)
      updateSavedDateRange.mutate({ originalName: editingRangeName, ...input });
    else saveDateRange.mutate(input);
  }
  function applySavedRange(name: string) {
    const saved = savedDateRanges.data?.find(range => range.name === name);
    if (!saved) return;
    setTrendRange("custom");
    setCustomStartDate(saved.startDate);
    setCustomEndDate(saved.endDate);
    setRangeName(saved.name);
    setEditingRangeName(saved.name);
  }
  function editSavedRange(name: string) {
    const saved = savedDateRanges.data?.find(range => range.name === name);
    if (saved) applySavedRange(saved.name);
  }
  function removeSavedRange(name: string) {
    deletedRangeRef.current = undoRangePayload(
      savedDateRanges.data?.find(range => range.name === name) || null
    );
    deleteSavedDateRange.mutate({ name });
    if (editingRangeName === name) {
      setEditingRangeName("");
      setRangeName("");
    }
  }
  function exportComparisonCsv() {
    const data = weeklyComparison.data;
    if (!data) return;
    const rows = [
      "weekStart,skill,score,attempts,roleFilter,countryFilter,experienceFilter",
    ];
    for (const point of data.trendSeries)
      for (const trend of parseSkillTrends(point.skillTrends || "[]"))
        rows.push(
          [
            new Date(point.weekStart).toISOString().slice(0, 10),
            trend.skill,
            trend.score,
            trend.attempts,
            peerFilters.role,
            peerFilters.country,
            peerFilters.experienceLevel,
          ]
            .map(value => `"${String(value).replaceAll('"', '""')}"`)
            .join(",")
        );
    const url = URL.createObjectURL(
      new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `global-ai-coach-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Filtered comparison CSV downloaded");
  }
  async function exportTrendPng() {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
    });
    const anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = `global-ai-coach-trends-${trendRange}.png`;
    anchor.click();
    toast.success("Trend chart PNG downloaded");
  }
  async function exportTrendPdf() {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
    });
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    pdf.setFontSize(20);
    pdf.text("Atlas Readiness — Filtered Comparison", 36, 38);
    pdf.setFontSize(10);
    pdf.setTextColor(90, 100, 115);
    pdf.text(
      `Range: ${trendRange === "custom" ? `${customStartDate || "start"} to ${customEndDate || "end"}` : `last ${trendRange} weeks`} · Role: ${peerFilters.role || "all"} · Country: ${peerFilters.country || "all"} · Experience: ${peerFilters.experienceLevel || "all"}`,
      36,
      56
    );
    const maxWidth = 770;
    const maxHeight = 480;
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      36,
      72,
      canvas.width * ratio,
      canvas.height * ratio
    );
    pdf.save(`global-ai-coach-comparison-${trendRange}.pdf`);
    toast.success("Filtered comparison PDF downloaded");
  }
  function downloadWeeklyPdf() {
    const summary = weeklySummary.data;
    if (!summary) return;
    const pdf = new jsPDF();
    pdf.setFontSize(22);
    pdf.text("Atlas Readiness", 20, 24);
    pdf.setFontSize(16);
    pdf.text("Weekly Progress Summary", 20, 36);
    pdf.setFontSize(11);
    pdf.setTextColor(90, 100, 115);
    pdf.text(
      `Week starting: ${new Date(summary.weekStart).toLocaleDateString()}`,
      20,
      48
    );
    pdf.setTextColor(20, 30, 45);
    pdf.setFontSize(13);
    pdf.text(`Practice attempts: ${summary.attempts}`, 20, 70);
    pdf.text(`Minutes practiced: ${summary.minutesPracticed}`, 20, 82);
    pdf.text(`Average score: ${summary.averageScore}/10`, 20, 94);
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(summary.summaryText, 170);
    pdf.text(lines, 20, 110);
    const skillTrends = summary.skillTrends
      ? (JSON.parse(summary.skillTrends) as Array<{
          skill: string;
          score: number;
          attempts: number;
        }>)
      : [];
    const chartY = 132;
    pdf.setFontSize(13);
    pdf.text("Skill-specific score trends", 20, chartY);
    pdf.setFontSize(10);
    skillTrends.slice(0, 5).forEach((item, index) => {
      const y = chartY + 12 + index * 14;
      pdf.setTextColor(50, 60, 75);
      pdf.text(`${item.skill} (${item.attempts})`, 20, y);
      pdf.setFillColor(225, 231, 239);
      pdf.roundedRect(75, y - 5, 95, 6, 2, 2, "F");
      pdf.setFillColor(163, 230, 53);
      pdf.roundedRect(75, y - 5, Math.max(2, item.score * 9.5), 6, 2, 2, "F");
      pdf.setTextColor(20, 30, 45);
      pdf.text(`${item.score}/10`, 175, y);
    });
    const retentionY = chartY + 90;
    pdf.setFontSize(13);
    pdf.text("Retention metric", 20, retentionY);
    pdf.setFillColor(225, 231, 239);
    pdf.circle(42, retentionY + 24, 18, "F");
    pdf.setFillColor(14, 116, 144);
    pdf.circle(42, retentionY + 24, 18, "S");
    pdf.setTextColor(20, 30, 45);
    pdf.setFontSize(14);
    pdf.text(`${summary.retentionRate ?? 0}%`, 30, retentionY + 29);
    pdf.setFontSize(10);
    pdf.text(
      summary.retentionRate === null
        ? "No previous-week baseline"
        : "Returned from the previous week",
      70,
      retentionY + 27
    );
    pdf.setTextColor(90, 100, 115);
    pdf.text("Generated by Atlas Readiness", 20, 280);
    pdf.save(
      `global-ai-coach-weekly-summary-${new Date(summary.weekStart).toISOString().slice(0, 10)}.pdf`
    );
    toast.success("Weekly summary PDF downloaded");
  }
  async function shareWeeklySummary() {
    const summary = weeklySummary.data;
    if (!summary) return;
    const text = `My Atlas Readiness weekly progress: ${summary.attempts} attempts, ${summary.minutesPracticed} minutes practiced, average score ${summary.averageScore}/10.`;
    const share = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (share.share) {
      await share.share({
        title: "My weekly coaching progress",
        text,
        url: window.location.href,
      });
      toast.success("Weekly summary shared");
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent("My Atlas Readiness progress")}&body=${encodeURIComponent(`${text}

Open Atlas Readiness: ${window.location.href}`)}`;
      toast.success("Email composer opened");
    }
  }
  function begin() {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    if (goal && timeline) {
      profileSave.mutate({
        ...profileDraft,
        targetRole: profileDraft.targetRole || selectedGoal?.title,
        weeklyMinutes: profileDraft.weeklyMinutes,
      });
      start.mutate({ interviewType: goal, timeline });
    }
  }
  function reset() {
    setSession(null);
    setQuestion(null);
    setFeedback(null);
    setAnswer("");
    setGoal(null);
    setTimeline(null);
  }

  if (session) {
    const completed = progressQuery.data?.totals.attempts ?? (feedback ? 1 : 0);
    const progress = Math.min(
      100,
      Math.round((completed / session.sessions) * 100)
    );
    return (
      <main className="min-h-screen bg-[#f6f8fb] text-slate-900">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <button
            className="flex items-center gap-3"
            onClick={reset}
            aria-label="Back to home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-lime-300">
              <Sparkles size={19} />
            </span>
            <span className="font-semibold tracking-tight">
              Atlas Readiness
            </span>
          </button>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{session.mode}</Badge>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw size={16} className="mr-2" /> New plan
            </Button>
          </div>
        </nav>
        <section className="mx-auto max-w-7xl px-6 pb-16 pt-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                Your coaching room
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
                Train with intent.
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                {selectedGoal?.title} · {selectedTimeline?.title} ·{" "}
                {session.focus}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-widest text-slate-600">
                Current mode
              </p>
              <p className="mt-1 font-semibold">
                {session.difficulty} calibration
              </p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Readiness</CardDescription>
                <CardTitle>{progress}%</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progress} />
                <p className="mt-3 text-sm text-slate-600">
                  {completed} of {session.sessions} practices completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Plan</CardDescription>
                <CardTitle>{session.sessions} sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Calibrated for your {selectedTimeline?.title} timeline.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Coach signal</CardDescription>
                <CardTitle className="text-2xl">
                  {feedback
                    ? `${feedback.overallScore}/10`
                    : progressQuery.data?.totals.averageScore
                      ? `${progressQuery.data.totals.averageScore}/10`
                      : "Ready"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  {feedback
                    ? "Feedback captured"
                    : "Pick a focused drill below"}
                </p>
              </CardContent>
            </Card>
          </div>
          {isAuthenticated && (
            <Card className="mt-6 border-lime-200 bg-lime-50">
              <CardContent className="p-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Bell size={16} className="text-emerald-700" /> Weekly
                      progress summary
                    </p>
                    {weeklySummary.data ? (
                      <>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {weeklySummary.data.summaryText}
                        </p>
                        <p className="mt-2 text-xs text-slate-600">
                          {weeklySummary.data.attempts} attempts ·{" "}
                          {weeklySummary.data.minutesPracticed} minutes ·{" "}
                          {weeklySummary.data.averageScore}/10 ·{" "}
                          {weeklySummary.data.retentionRate ?? 0}% retention
                        </p>
                        <div className="mt-4 rounded-2xl border border-lime-200 bg-white/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                            AI-recommended coaching modules
                          </p>
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            {parseRecommendedModules(
                              weeklySummary.data.recommendedModules
                            ).map(module => (
                              <div
                                key={module.title}
                                className="rounded-xl bg-slate-50 p-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {module.title}
                                  </p>
                                  <Badge variant="secondary">
                                    {module.score}/10
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  {module.reason}
                                </p>
                                <p className="mt-2 text-xs font-medium text-emerald-700">
                                  Next: {module.action}
                                </p>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <select
                                    aria-label={`${module.title} difficulty`}
                                    value={
                                      modulePrefs[module.title]?.difficulty ||
                                      modulePrefs._default?.difficulty ||
                                      profileDraft.preferredModuleDifficulty
                                    }
                                    onChange={event =>
                                      setModulePreference(
                                        module.title,
                                        "difficulty",
                                        event.target.value
                                      )
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900"
                                  >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">
                                      Intermediate
                                    </option>
                                    <option value="advanced">Advanced</option>
                                    <option value="expert">Expert</option>
                                  </select>
                                  <select
                                    aria-label={`${module.title} duration`}
                                    value={
                                      modulePrefs[module.title]?.duration ||
                                      modulePrefs._default?.duration ||
                                      profileDraft.preferredModuleDuration
                                    }
                                    onChange={event =>
                                      setModulePreference(
                                        module.title,
                                        "duration",
                                        event.target.value
                                      )
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900"
                                  >
                                    <option value="15">15 min</option>
                                    <option value="30">30 min</option>
                                    <option value="45">45 min</option>
                                    <option value="60">60 min</option>
                                  </select>
                                </div>
                                <Button
                                  size="sm"
                                  className="mt-3 w-full"
                                  onClick={() => acceptModule(module)}
                                >
                                  Accept module
                                  <ArrowRight size={14} className="ml-2" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                        Your weekly report is ready to generate. Create it after
                        a practice session to see activity, time, scores, skill
                        trends, and retention in one place.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {weeklySummary.data && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void shareWeeklySummary()}
                        >
                          <Share2 size={15} className="mr-2" /> Share
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadWeeklyPdf}
                        >
                          <Download size={15} className="mr-2" /> PDF report
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      onClick={() => generateWeeklySummary.mutate()}
                      disabled={generateWeeklySummary.isPending}
                    >
                      {generateWeeklySummary.isPending ? (
                        <>
                          <LoaderCircle
                            size={15}
                            className="mr-2 animate-spin"
                          />{" "}
                          Generating…
                        </>
                      ) : weeklySummary.data ? (
                        "Refresh summary"
                      ) : (
                        "Generate summary"
                      )}
                    </Button>
                  </div>
                </div>
                {weeklySummary.data && weeklyComparison.data && (
                  <div className="mt-5 space-y-4 rounded-2xl border border-lime-200 bg-white/60 p-4 text-sm">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-600">
                          Compare progress
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          Previous weeks and anonymized peer averages
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          value={peerFilters.role}
                          onChange={event =>
                            setPeerFilters(current => ({
                              ...current,
                              role: event.target.value,
                            }))
                          }
                          placeholder="Filter role"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                        />
                        <input
                          value={peerFilters.country}
                          onChange={event =>
                            setPeerFilters(current => ({
                              ...current,
                              country: event.target.value,
                            }))
                          }
                          placeholder="Filter country"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                        />
                        <select
                          value={peerFilters.experienceLevel}
                          onChange={event =>
                            setPeerFilters(current => ({
                              ...current,
                              experienceLevel: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                        >
                          <option value="">All experience</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-600">
                          Previous weeks
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {weeklyComparison.data.previousWeeks.length
                            ? `${weeklyComparison.data.previousWeeks[0]?.averageScore}/10 latest`
                            : "No baseline yet"}
                        </p>
                        <p className="text-xs text-slate-600">
                          {weeklyComparison.data.previousWeeks.length} saved
                          comparison weeks
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-600">
                          Peer average
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {weeklyComparison.data.peerAverageScore || "—"}/10
                        </p>
                        <p className="text-xs text-slate-600">
                          {weeklyComparison.data.peerCount} matching summaries
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-600">
                          Time benchmark
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {weeklyComparison.data.peerAverageMinutes || "—"} min
                        </p>
                        <p className="text-xs text-slate-600">
                          Filtered anonymized average
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-600">
                          Chart range
                        </span>
                        <select
                          value={trendRange}
                          onChange={event =>
                            setTrendRange(
                              event.target.value as "4" | "8" | "custom"
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"
                        >
                          <option value="4">Last 4 weeks</option>
                          <option value="8">Last 8 weeks</option>
                          <option value="custom">Custom dates</option>
                        </select>
                        {savedDateRanges.data &&
                          savedDateRanges.data.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <select
                                value=""
                                onChange={event =>
                                  applySavedRange(event.target.value)
                                }
                                aria-label="Saved date ranges"
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"
                              >
                                <option value="">Saved ranges…</option>
                                {savedDateRanges.data.map(range => (
                                  <option key={range.name} value={range.name}>
                                    {range.name}
                                  </option>
                                ))}
                              </select>
                              {savedDateRanges.data.map(range => (
                                <span
                                  key={`actions-${range.name}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1"
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-1.5 text-[10px]"
                                    onClick={() => editSavedRange(range.name)}
                                    aria-label={`Edit ${range.name}`}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-1.5 text-[10px] text-rose-600"
                                    onClick={() => removeSavedRange(range.name)}
                                    aria-label={`Delete ${range.name}`}
                                  >
                                    Delete
                                  </Button>
                                </span>
                              ))}
                            </div>
                          )}
                        {trendRange === "custom" && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={event =>
                                setCustomStartDate(event.target.value)
                              }
                              aria-label="Trend start date"
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"
                            />
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={event =>
                                setCustomEndDate(event.target.value)
                              }
                              aria-label="Trend end date"
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"
                            />
                            <input
                              value={rangeName}
                              onChange={event =>
                                setRangeName(event.target.value)
                              }
                              placeholder="Name this range"
                              aria-label="Saved range name"
                              className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={saveNamedRange}
                              disabled={
                                saveDateRange.isPending ||
                                updateSavedDateRange.isPending
                              }
                            >
                              {editingRangeName ? "Update range" : "Save range"}
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportComparisonCsv}
                        >
                          <Download size={14} className="mr-1" /> CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void exportTrendPng()}
                        >
                          <Download size={14} className="mr-1" /> PNG
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void exportTrendPdf()}
                        >
                          <Download size={14} className="mr-1" /> PDF
                        </Button>
                      </div>
                    </div>
                    <div ref={chartRef}>
                      <SkillTrendChart
                        series={weeklyComparison.data.trendSeries}
                        range={
                          trendRange === "custom" ? 100 : Number(trendRange)
                        }
                        peerAverages={weeklyComparison.data.peerAverageBySkill}
                      />
                    </div>
                  </div>
                )}
                {generateWeeklySummary.isPending && (
                  <div className="mt-5" aria-live="polite">
                    <div className="mb-2 flex justify-between text-xs font-medium text-slate-600">
                      <span>Calculating your weekly progress</span>
                      <span>Processing</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-2 w-2/3 animate-pulse rounded-full bg-emerald-600 transition-all" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {!question && !feedback && (
            <Card className="mt-6 overflow-hidden border-0 bg-slate-950 text-white">
              <CardContent className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
                <div>
                  <Badge className="mb-4 bg-lime-300 text-slate-950">
                    Next best action
                  </Badge>
                  <h2 className="max-w-xl text-3xl font-semibold tracking-tight">
                    Turn your weakest signal into your next advantage.
                  </h2>
                  <p className="mt-3 max-w-xl text-slate-300">
                    The coach will generate a realistic prompt, then evaluate
                    your answer against clarity, confidence, technical judgment,
                    and time.
                  </p>
                </div>
                <Button
                  className="bg-lime-300 text-slate-950 hover:bg-lime-200"
                  size="lg"
                  onClick={() =>
                    generate.mutate({
                      sessionId: session.sessionId,
                      interviewType: session.interviewType,
                      difficulty: session.difficulty,
                      focus: session.focus,
                    })
                  }
                  disabled={generate.isPending}
                >
                  {generate.isPending ? "Generating…" : "Generate practice"}
                  <ArrowRight size={17} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}
          {question && !feedback && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardDescription>
                      Practice prompt · {question.estimatedMinutes || 15}{" "}
                      minutes
                    </CardDescription>
                    <CardTitle className="mt-2 max-w-3xl text-2xl">
                      {question.question ||
                        "Your personalized practice question"}
                    </CardTitle>
                  </div>
                  <Badge variant="outline">
                    {question.coachType === "ai"
                      ? "OpenRouter AI"
                      : "Resilient fallback"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-3">
                  <span>
                    <strong className="text-slate-900">Context:</strong>{" "}
                    {question.context}
                  </span>
                  <span>
                    <strong className="text-slate-900">Hint:</strong>{" "}
                    {question.hints?.[0]}
                  </span>
                  <span>
                    <strong className="text-slate-900">Criteria:</strong>{" "}
                    {question.evaluationCriteria?.join(", ")}
                  </span>
                </div>
                {(question.rubric || question.jurisdictionNotes) && (
                  <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 md:grid-cols-2">
                    <span>
                      <strong className="text-slate-900">Role rubric:</strong>{" "}
                      {question.rubric}
                    </span>
                    <span>
                      <strong className="text-slate-900">
                        Jurisdiction context:
                      </strong>{" "}
                      {question.jurisdictionNotes}
                    </span>
                  </div>
                )}
                <textarea
                  value={answer}
                  onChange={event => setAnswer(event.target.value)}
                  className="min-h-48 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                  placeholder="Write your answer as if you were in the real room…"
                />
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock3 size={15} />{" "}
                    {startedAt
                      ? Math.max(
                          1,
                          Math.round((Date.now() - startedAt) / 60000)
                        )
                      : 1}{" "}
                    min elapsed
                  </span>
                  <Button
                    onClick={() =>
                      evaluate.mutate({
                        sessionId: session.sessionId,
                        question:
                          question.question || "Practice interview question",
                        answer,
                        interviewType: session.interviewType,
                        timeTaken: Math.max(
                          1,
                          Math.round(
                            (Date.now() - (startedAt || Date.now())) / 60000
                          )
                        ),
                      })
                    }
                    disabled={!answer.trim() || evaluate.isPending}
                  >
                    {evaluate.isPending ? "Reviewing…" : "Get feedback"}
                    <Sparkles size={16} className="ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {feedback && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardDescription>Coach review</CardDescription>
                    <CardTitle className="mt-2 text-3xl">
                      Good first rep. Now sharpen it.
                    </CardTitle>
                  </div>
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-lime-100 text-2xl font-semibold text-slate-950">
                    {feedback.overallScore}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    ["Communication", feedback.communicationScore],
                    ["Confidence", feedback.confidenceScore],
                    ["Time", feedback.timeManagementScore],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <p className="text-sm text-slate-600">{label}</p>
                      <p className="mt-2 text-2xl font-semibold">{value}/10</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold">What worked</h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {feedback.strengths?.map(item => (
                        <li key={item} className="flex gap-2">
                          <Check
                            size={16}
                            className="mt-0.5 text-emerald-600"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold">Next improvement</h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {feedback.improvements?.map(item => (
                        <li key={item} className="flex gap-2">
                          <Zap size={16} className="mt-0.5 text-amber-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-slate-200">
                  <p className="text-sm leading-6">
                    {feedback.detailedFeedback}
                  </p>
                </div>
                <Button
                  className="mt-6"
                  onClick={() => {
                    setQuestion(null);
                    setFeedback(null);
                    setAnswer("");
                  }}
                >
                  Continue training
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    );
  }

  const historyPoints = (readinessHistory.data || []).slice(0, 12).reverse();
  const historyMax = Math.max(100, ...historyPoints.map(point => point.score));

  const targetStandardForm = (
    <Card className="mb-8 overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-950 text-white">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <CardDescription className="text-lime-300">
              Step 0 · Define the standard
            </CardDescription>
            <CardTitle className="mt-2 text-2xl text-white">
              What exactly are you preparing to pass?
            </CardTitle>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Atlas uses this context to build the right rubric instead of
              giving you generic practice.
            </p>
          </div>
          <Badge className="w-fit bg-white/10 text-lime-200 hover:bg-white/10">
            Readiness Graph
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm text-slate-600">
            Outcome type
            <select
              value={targetStandardDraft.outcomeType}
              onChange={e =>
                updateTargetStandard("outcomeType", e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900"
            >
              <option value="job-interview">Job interview</option>
              <option value="exam">School or professional exam</option>
              <option value="license">License or regulated assessment</option>
              <option value="promotion">
                Promotion or internal assessment
              </option>
              <option value="other">Other high-stakes goal</option>
            </select>
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            Assessment name <span className="text-rose-500">*</span>
            <input
              value={targetStandardDraft.targetName}
              onChange={e => updateTargetStandard("targetName", e.target.value)}
              placeholder="e.g. Senior Backend Engineer — final loop"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600">
            Evaluator or organization
            <input
              value={targetStandardDraft.evaluator}
              onChange={e => updateTargetStandard("evaluator", e.target.value)}
              placeholder="e.g. Acme, AWS, University"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600">
            Country or jurisdiction
            <input
              value={targetStandardDraft.jurisdiction}
              onChange={e =>
                updateTargetStandard("jurisdiction", e.target.value)
              }
              placeholder="e.g. Germany, California, Global"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600">
            Target date
            <input
              type="date"
              value={targetStandardDraft.targetDate}
              onChange={e => updateTargetStandard("targetDate", e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600">
            Practice language
            <select
              value={targetStandardDraft.language}
              onChange={e => updateTargetStandard("language", e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="ar">Arabic</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Assessment format
            <input
              value={targetStandardDraft.format}
              onChange={e => updateTargetStandard("format", e.target.value)}
              placeholder="e.g. 4 rounds, oral + written"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            Official source or rubric URL
            <input
              type="url"
              value={targetStandardDraft.sourceUrl}
              onChange={e => updateTargetStandard("sourceUrl", e.target.value)}
              placeholder="https://…"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-3">
            What should Atlas know before it coaches you?
            <textarea
              value={targetStandardDraft.notes}
              onChange={e => updateTargetStandard("notes", e.target.value)}
              placeholder="Paste requirements, constraints, topics, or anything that changes how you will be evaluated."
              className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl bg-lime-50 p-4 sm:flex-row sm:items-center">
          <p className="text-sm leading-6 text-slate-700">
            This becomes your current Target Standard. You can update it as the
            goal changes.
          </p>
          <Button
            onClick={saveTargetStandard}
            disabled={targetStandardSave.isPending}
            className="bg-slate-950 text-white hover:bg-slate-800"
          >
            {targetStandardSave.isPending
              ? "Saving…"
              : isAuthenticated
                ? "Save my standard"
                : "Sign in to save"}
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const readinessAndEvidence = isAuthenticated && (
    <div className="mb-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardDescription>
                <TrendingUp size={15} className="mr-2 inline" /> Readiness Graph
              </CardDescription>
              <CardTitle>Evidence against your standard</CardTitle>
            </div>
            {readinessScore.data && (
              <div className="text-right">
                <div className="text-3xl font-semibold text-slate-950">
                  {readinessScore.data.score}%
                </div>
                <div className="text-xs text-slate-500">
                  {readinessScore.data.confidence} confidence
                </div>
              </div>
            )}
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Atlas compares scored practice evidence with the weighted criteria
            in your current Target Standard. It is a coaching signal, not a
            guarantee of an external result.
          </p>
        </CardHeader>
        <CardContent>
          {!readinessScore.data ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
              Save a Target Standard and complete a few drills to see evidence-
              based readiness.
            </div>
          ) : (
            <div className="space-y-5">
              {readinessScore.data.breakdown.map(item => (
                <div key={item.id}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-800">
                      {item.label}
                    </span>
                    <span className="text-slate-500">
                      {item.score}/10 ·{" "}
                      {item.status === "ready"
                        ? "Ready"
                        : item.status === "close"
                          ? "Close"
                          : "Gap"}
                    </span>
                  </div>
                  <Progress value={item.readiness} />
                  <p className="mt-1 text-xs text-slate-500">
                    Weight {item.weight}% · {item.evidenceCount} practice
                    attempts
                  </p>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-500">
                <Badge variant="secondary">
                  Version {readinessScore.data.version}
                </Badge>
                <Badge variant="secondary">
                  {readinessScore.data.attempts} attempts
                </Badge>
                <Badge variant="secondary">
                  Practice average {readinessScore.data.overallPracticeScore}/10
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardDescription>Forecast & next drills</CardDescription>
          <CardTitle>Turn evidence into a plan</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Forecasts are directional planning signals; they never guarantee an
            external outcome.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {readinessScore.data?.forecast ? (
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300">
                  Target-date outlook
                </span>
                <Badge className="bg-white/15 text-white">
                  {readinessScore.data.forecast.status}
                </Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {readinessScore.data.forecast.daysRemaining} days remaining
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Estimated {readinessScore.data.forecast.estimatedWeeks} weeks to
                reach the 80% planning threshold at the current practice pace.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Add a target date to unlock a readiness forecast.
            </div>
          )}
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-900">
              Criterion → practice module mapping
            </p>
            <div className="space-y-2">
              {(readinessScore.data?.modules || [])
                .slice(0, 4)
                .map((module, index) => {
                  const item = module as {
                    title?: string;
                    skill?: string;
                    durationMinutes?: number;
                  };
                  return (
                    <div
                      key={`${item.title || "module"}-${index}`}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-800">
                          {item.title || "Targeted practice drill"}
                        </span>
                        <Badge variant="secondary">
                          {item.durationMinutes || 30} min
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Focus: {item.skill || "criterion gap"}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">
                Readiness trend
              </p>
              <span className="text-xs text-slate-500">
                Latest 12 snapshots
              </span>
            </div>
            {historyPoints.length ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <svg
                  viewBox="0 0 360 140"
                  role="img"
                  aria-labelledby="readiness-trend-title readiness-trend-desc"
                  className="h-36 w-full overflow-visible"
                >
                  <title id="readiness-trend-title">
                    Readiness score trend
                  </title>
                  <desc id="readiness-trend-desc">
                    Readiness score snapshots over time, from 0 to 100 percent.
                  </desc>
                  <line x1="24" y1="12" x2="24" y2="116" stroke="#cbd5e1" />
                  <line x1="24" y1="116" x2="348" y2="116" stroke="#cbd5e1" />
                  <text x="0" y="18" className="fill-slate-500 text-[9px]">
                    100
                  </text>
                  <text x="7" y="120" className="fill-slate-500 text-[9px]">
                    0
                  </text>
                  <polyline
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={historyPoints
                      .map((point, index) => {
                        const x =
                          historyPoints.length === 1
                            ? 186
                            : 28 + (index * 316) / (historyPoints.length - 1);
                        const y = 116 - (point.score / historyMax) * 100;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                  {historyPoints.map((point, index) => {
                    const x =
                      historyPoints.length === 1
                        ? 186
                        : 28 + (index * 316) / (historyPoints.length - 1);
                    const y = 116 - (point.score / historyMax) * 100;
                    return (
                      <g key={point.id}>
                        <circle
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#0284c7"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <title>{`${point.score}% on ${new Date(point.createdAt).toLocaleDateString()}`}</title>
                      </g>
                    );
                  })}
                </svg>
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>
                    {new Date(historyPoints[0].createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    {new Date(
                      historyPoints[historyPoints.length - 1].createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Complete a drill to begin your trend.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">
                Forecast accuracy
              </p>
              <Badge variant="secondary">
                {forecastAccuracy.data?.accuracyPercent == null
                  ? "Awaiting outcomes"
                  : forecastAccuracy.data.resolvedForecasts <
                      (forecastAccuracy.data.minimumSampleSize || 30)
                    ? "Directional estimate"
                    : `${forecastAccuracy.data.accuracyPercent}% accurate`}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Record what happened after a real assessment to calibrate Atlas’s
              directional forecasts.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <label className="text-xs text-slate-600 sm:col-span-3">
                Forecast snapshot
                <select
                  value={
                    outcomeHistoryId ||
                    historyPoints[historyPoints.length - 1]?.id?.toString() ||
                    ""
                  }
                  onChange={event => setOutcomeHistoryId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900"
                >
                  {historyPoints.map(point => (
                    <option key={point.id} value={point.id}>
                      {new Date(point.createdAt).toLocaleDateString()} ·{" "}
                      {point.score}% readiness
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Actual outcome
                <select
                  value={actualOutcome}
                  onChange={event =>
                    setActualOutcome(
                      event.target.value as "passed" | "not-passed"
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900"
                >
                  <option value="passed">Passed</option>
                  <option value="not-passed">Not passed</option>
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Actual score
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={actualScore}
                  onChange={event => setActualScore(event.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-900"
                />
              </label>
              <Button
                className="self-end"
                disabled={
                  !historyPoints.length || recordReadinessOutcome.isPending
                }
                onClick={() =>
                  recordReadinessOutcome.mutate({
                    historyId: Number(
                      outcomeHistoryId ||
                        historyPoints[historyPoints.length - 1]?.id
                    ),
                    actualOutcome,
                    actualScore: actualScore ? Number(actualScore) : undefined,
                  })
                }
              >
                {recordReadinessOutcome.isPending
                  ? "Saving…"
                  : "Record outcome"}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {forecastAccuracy.data?.resolvedForecasts || 0} of{" "}
              {forecastAccuracy.data?.totalForecasts || 0} snapshots resolved ·{" "}
              {forecastAccuracy.data?.minimumSampleSize || 30} required for a
              stable estimate
            </p>
            {forecastAccuracy.data?.calibration?.length ? (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-800">
                  Calibration by target context
                </p>
                <div className="mt-2 space-y-2">
                  {forecastAccuracy.data.calibration.map(segment => (
                    <div
                      key={`${segment.outcomeType}-${segment.jurisdiction}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="min-w-0 truncate text-slate-600">
                        <span className="font-medium capitalize text-slate-800">
                          {segment.outcomeType.replaceAll("-", " ")}
                        </span>
                        <span className="text-slate-400"> · </span>
                        {segment.jurisdiction}
                      </span>
                      <span className="shrink-0 font-semibold text-slate-900">
                        {segment.accuracyPercent}% ({segment.total})
                      </span>
                      {segment.lowSample ? (
                        <span
                          className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                          title={`Only ${segment.total} resolved forecasts; ${segment.minimumSampleSize} are required for a stable estimate. Treat this accuracy as directional.`}
                        >
                          Low sample ({segment.total}/
                          {segment.minimumSampleSize})
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardDescription>
            <Globe2 size={15} className="mr-2 inline" /> Source room
          </CardDescription>
          <CardTitle>Review the official context</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Capture a public source, inspect the excerpt, then approve it before
            Atlas treats it as trusted context.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="mb-4 w-full"
            onClick={captureOfficialSource}
            disabled={ingestSource.isPending}
          >
            {ingestSource.isPending
              ? "Capturing source…"
              : "Capture URL for review"}
          </Button>
          <div className="space-y-3">
            {!targetSources.data?.length ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No sources captured yet.
              </p>
            ) : (
              targetSources.data.map(source => {
                const reviewHistory = (
                  targetSourceReviewHistory.data || []
                ).filter(review => review.sourceId === source.id);
                const sourceChanged = source.changeStatus === "changed";
                return (
                  <div
                    key={source.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {source.title || source.publisher || source.url}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {source.jurisdiction || "Global"} ·{" "}
                          {source.status.replace("_", " ")}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge variant="secondary">{source.sourceType}</Badge>
                        <Badge
                          variant={sourceChanged ? "destructive" : "outline"}
                          aria-label={`Source status: ${sourceChanged ? "changed" : "stable"}`}
                        >
                          {sourceChanged ? "Changed" : "Stable"}
                        </Badge>
                      </div>
                    </div>
                    {source.contentExcerpt && (
                      <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">
                        {source.contentExcerpt}
                      </p>
                    )}
                    {reviewHistory.length > 0 && (
                      <details className="mt-3 rounded-xl bg-slate-50 p-3">
                        <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                          Review history ({reviewHistory.length})
                        </summary>
                        <ol className="mt-3 space-y-2 border-l border-slate-200 pl-3">
                          {reviewHistory.map(review => (
                            <li
                              key={review.id}
                              className="text-xs text-slate-600"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium capitalize text-slate-800">
                                  {review.status.replace("_", " ")}
                                </span>
                                <time
                                  dateTime={new Date(
                                    review.reviewedAt
                                  ).toISOString()}
                                >
                                  {new Date(
                                    review.reviewedAt
                                  ).toLocaleDateString()}
                                </time>
                              </div>
                              <p>
                                {review.previousStatus
                                  ? `From ${review.previousStatus.replace("_", " ")}`
                                  : "Initial review"}
                                {review.reviewNotes
                                  ? ` · ${review.reviewNotes}`
                                  : ""}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                    {source.status === "pending_review" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            reviewSource.mutate({
                              sourceId: source.id,
                              status: "approved",
                            })
                          }
                          disabled={reviewSource.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            reviewSource.mutate({
                              sourceId: source.id,
                              status: "rejected",
                            })
                          }
                          disabled={reviewSource.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm lg:col-span-2">
        <CardHeader>
          <CardDescription>
            <RotateCcw size={15} className="mr-2 inline" /> Change history
          </CardDescription>
          <CardTitle>Rubric snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          {!targetStandardVersions.data?.length ? (
            <p className="text-sm text-slate-500">
              Your first snapshot will appear after saving the standard.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {targetStandardVersions.data.slice(0, 6).map(version => (
                <div key={version.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge>v{version.versionNumber}</Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    {version.changeNote || "Target Standard snapshot"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const profileForm = isAuthenticated && (
    <Card className="mb-12 border-slate-200">
      <CardHeader>
        <CardDescription>
          <Settings2 size={15} className="mr-2 inline" /> Personal calibration
        </CardDescription>
        <CardTitle>Make the coach more relevant</CardTitle>
        <p className="text-sm text-slate-600">
          These settings shape language, context, target role, and recommended
          weekly load.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-5">
          <label className="text-sm text-slate-600">
            Language
            <select
              value={profileDraft.preferredLanguage}
              onChange={e => updateProfile("preferredLanguage", e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="ar">Arabic</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Country
            <input
              value={profileDraft.country}
              onChange={e => updateProfile("country", e.target.value)}
              placeholder="e.g. Sweden"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600">
            Target role
            <input
              value={profileDraft.targetRole}
              onChange={e => updateProfile("targetRole", e.target.value)}
              placeholder="e.g. Product manager"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600">
            Experience
            <select
              value={profileDraft.experienceLevel}
              onChange={e => updateProfile("experienceLevel", e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900"
            >
              <option value="">Choose level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Weekly minutes
            <input
              type="number"
              min="0"
              max="10000"
              value={profileDraft.weeklyMinutes}
              onChange={e =>
                updateProfile("weeklyMinutes", Number(e.target.value))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
            />
          </label>
        </div>
        <Button
          className="mt-5"
          onClick={saveProfile}
          disabled={profileSave.isPending}
        >
          <Save size={16} className="mr-2" />
          {profileSave.isPending ? "Saving…" : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f8fb] text-slate-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-slate-950">
            <img
              src="/manus-storage/atlas-readiness-logo_f4afc1d1.png"
              alt=""
              className="h-8 w-8 object-contain"
            />
          </span>
          <span className="font-semibold tracking-tight">Atlas Readiness</span>
        </div>
        <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <span>Know the standard</span>
          <span>Train the gap</span>
          <span>Deliver when it counts</span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <Badge variant="secondary">{user?.name || "Signed in"}</Badge>
          )}
          <Badge variant="secondary">
            <Globe2 size={14} className="mr-1" /> Global
          </Badge>
        </div>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-12 md:grid-cols-[1.12fr_0.88fr] md:items-center md:pt-24">
        <div>
          <Badge className="mb-6 bg-lime-200 text-slate-900 hover:bg-lime-200">
            <Sparkles size={14} className="mr-1" /> Your unfair practice
            advantage
          </Badge>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] md:text-7xl">
            Get ready for the moment that matters.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Atlas maps the real evaluation, finds your highest-risk gaps, and
            gives you the next drill that moves you closer to ready.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600" />{" "}
              Deadline-calibrated plans
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600" /> Evidence-based
              feedback
            </span>
          </div>
        </div>
        <div className="relative rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 md:p-8">
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                A coach that calibrates
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-lime-200">
                LIVE LOOP
              </span>
            </div>
            <div className="mt-10 space-y-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Time available</span>
                  <span className="text-lime-300">3 days</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-1/4 rounded-full bg-lime-300" />
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Focus signal</span>
                  <span className="text-lime-300">Communication</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-lime-300 px-3 py-1 text-xs text-slate-950">
                    Clarity
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-400">
                    Evidence
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-400">
                    Timing
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-lime-300/30 bg-lime-300/10 p-4">
                <p className="text-sm text-slate-300">Next best action</p>
                <p className="mt-2 font-medium">
                  Practice one high-frequency question under a timer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-16">
        {targetStandardForm}
        {readinessAndEvidence}
        {profileForm}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
              Build your plan
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              What are you preparing for?
            </h2>
          </div>
          <p className="hidden max-w-sm text-right text-sm text-slate-600 md:block">
            Start with the standard. Atlas will calibrate the goal, the clock,
            and the next best action.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {goals.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setGoal(item.id)}
                className="text-left transition duration-200 hover:-translate-y-1"
              >
                <Card
                  className={`h-full transition ${goal === item.id ? "border-slate-950 bg-slate-950 text-white shadow-xl" : "hover:shadow-xl"}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span
                        className={`grid h-11 w-11 place-items-center rounded-2xl ${goal === item.id ? "bg-lime-300 text-slate-950" : "bg-slate-100 text-slate-900"}`}
                      >
                        <Icon size={21} />
                      </span>
                      {item.tag && (
                        <Badge
                          variant={goal === item.id ? "default" : "secondary"}
                        >
                          {item.tag}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-4 text-xl">{item.title}</CardTitle>
                    <CardDescription
                      className={goal === item.id ? "text-slate-300" : ""}
                    >
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </button>
            );
          })}
        </div>
        {goal && (
          <div className="mt-12">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                  Step 2
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  How much time do you have?
                </h2>
              </div>
              <span className="text-sm text-slate-600">
                Selected: {selectedGoal?.title}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {timelines.map(item => (
                <button
                  key={item.id}
                  onClick={() => setTimeline(item.id)}
                  className={`rounded-2xl border bg-white p-4 text-left transition ${timeline === item.id ? "border-slate-950 bg-slate-950 text-white shadow-xl" : "border-slate-200 hover:-translate-y-1 hover:shadow-lg"}`}
                >
                  <span
                    className={`mb-6 block h-3 w-3 rounded-full ${item.color}`}
                  />
                  <p className="font-semibold">{item.title}</p>
                  <p
                    className={`mt-1 text-sm ${timeline === item.id ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {item.detail}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
        {goal && timeline && (
          <div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-3xl bg-lime-300 p-6 md:flex-row md:items-center md:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-700">
                Ready when you are
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                {selectedGoal?.title} · {selectedTimeline?.title}
              </h3>
              <p className="mt-1 text-slate-700">
                Your plan will prioritize the highest-value practice first.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-slate-950 text-white hover:bg-slate-800"
              onClick={begin}
              disabled={start.isPending}
            >
              {start.isPending
                ? "Calibrating…"
                : isAuthenticated
                  ? "Start my coaching plan"
                  : "Sign in to start"}
              <ArrowRight size={17} className="ml-2" />
            </Button>
          </div>
        )}
      </section>
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3">
          {features.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.title}>
                <Icon size={22} className="text-slate-900" />
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      {user?.role === "admin" && analyticsSummary.data && (
        <AdminAnalytics
          data={analyticsSummary.data}
          refreshStatus={sourceRefreshStatus.data}
          refreshRuns={sourceRefreshRuns.data}
        />
      )}
    </main>
  );
}

function AdminAnalytics({
  data,
  refreshStatus,
  refreshRuns,
}: {
  data: AnalyticsData;
  refreshStatus?: SourceRefreshStatus;
  refreshRuns?: SourceRefreshRun[];
}) {
  const skills = Array.from(new Set(data.skillTrends.map(item => item.skill)));
  const latestBySkill = skills
    .map(
      skill =>
        data.skillTrends.filter(item => item.skill === skill).slice(-1)[0]
    )
    .filter(Boolean);
  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
              <BarChart3 size={15} className="mr-2 inline" /> Admin control room
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Behavior, retention, and coach quality
            </h2>
          </div>
          <Badge variant="secondary">Observed data only</Badge>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric label="Events" value={String(data.totalEvents)} />
          <Metric label="Unique users" value={String(data.uniqueUsers)} />
          <Metric label="Completion" value={`${data.completionRate}%`} />
          <Metric
            label="Cohorts"
            value={String(data.retentionCohorts.length)}
          />
        </div>
        <SourceRefreshHistory status={refreshStatus} runs={refreshRuns || []} />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">Retention cohorts</CardTitle>
                  <CardDescription>
                    Weekly active return rate by signup cohort.
                  </CardDescription>
                </div>
                <AnalyticsExportButton />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.retentionCohorts.slice(-4).map(cohort => (
                <div key={cohort.cohort}>
                  <div className="flex justify-between text-sm">
                    <span>{cohort.cohort}</span>
                    <span>{cohort.users} users</span>
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1">
                    {cohort.weeks.map(week => (
                      <div
                        key={week.week}
                        title={`${week.rate}% retained`}
                        className="h-8 rounded bg-slate-100 p-1 text-center text-[10px] text-slate-600"
                        style={{
                          backgroundColor: `rgba(163, 230, 53, ${Math.max(0.12, week.rate / 100)})`,
                        }}
                      >
                        W{week.week}
                        <br />
                        {week.rate}%
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Skill score trends</CardTitle>
              <CardDescription>
                Latest overall and dimension scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestBySkill.map(item => (
                <div key={item.skill} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{item.skill}</span>
                    <span className="font-semibold">{item.overall}/10</span>
                  </div>
                  <div className="mt-2 h-2 rounded bg-slate-200">
                    <div
                      className="h-2 rounded bg-slate-950"
                      style={{ width: `${item.overall * 10}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    Technical {item.technical} · Communication{" "}
                    {item.communication} · Confidence {item.confidence}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                Coach-quality comparison
              </CardTitle>
              <CardDescription>
                Observed scores by provider path.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.coachQuality.map(item => (
                <div
                  key={item.coachType}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-medium">{item.coachType}</p>
                    <p className="text-xs text-slate-600">
                      {item.attempts} attempts · comm {item.communication}
                    </p>
                  </div>
                  <Badge
                    variant={item.coachType === "ai" ? "default" : "secondary"}
                  >
                    {item.overall}/10
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
function SkillTrendChart({
  series,
  range,
  peerAverages,
}: {
  series: Array<{ weekStart: Date; skillTrends: string | null }>;
  range: number;
  peerAverages: Array<{
    skill: string;
    score: number;
    attempts: number;
    sampleSize?: number;
    confidence?: string;
  }>;
}) {
  const [zoom, setZoom] = useState(1);
  const [windowStart, setWindowStart] = useState(0);
  const [hovered, setHovered] = useState<{
    skill: string;
    week: string;
    score: number;
    attempts: number;
    delta: number | null;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("Chart view ready.");
  const touchStart = useRef<{
    x: number;
    y: number;
    startedAt: number;
    distance: number | null;
  } | null>(null);
  const windowSize = Math.max(2, Math.ceil(range / zoom));
  const maxStart = Math.max(0, series.length - windowSize);
  function animateWindowTo(target: number) {
    const from = windowStart;
    const destination = Math.max(0, Math.min(maxStart, target));
    setAnnouncement(
      `Moving to chart window ${destination + 1} of ${maxStart + 1}.`
    );
    const startedAt = performance.now();
    function frame(now: number) {
      const progress = Math.min(1, (now - startedAt) / 220);
      setWindowStart(
        Math.round(from + (destination - from) * easeOutCubic(progress))
      );
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  const visibleSeries = series.slice(
    Math.min(windowStart, maxStart),
    Math.min(windowStart, maxStart) + windowSize
  );
  function pinchDistance(touches: React.TouchList) {
    return touches.length >= 2
      ? Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
        )
      : null;
  }
  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      startedAt: performance.now(),
      distance: pinchDistance(event.touches),
    };
  }
  function onTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const startTouch = touchStart.current;
    if (!startTouch || !startTouch.distance) return;
    const currentDistance = pinchDistance(event.touches);
    if (!currentDistance) return;
    const ratio = currentDistance / startTouch.distance;
    if (ratio > 1.12) {
      const nextZoom = Math.min(4, zoom + 1);
      setZoom(nextZoom);
      setAnnouncement(`Zoom ${nextZoom} times.`);
      touchStart.current = { ...startTouch, distance: currentDistance };
    } else if (ratio < 0.88) {
      const nextZoom = Math.max(1, zoom - 1);
      setZoom(nextZoom);
      setAnnouncement(`Zoom ${nextZoom} times.`);
      touchStart.current = { ...startTouch, distance: currentDistance };
    }
  }
  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startTouch = touchStart.current;
    touchStart.current = null;
    if (!startTouch || startTouch.distance) return;
    const dx = event.changedTouches[0].clientX - startTouch.x;
    const dy = event.changedTouches[0].clientY - startTouch.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
    const steps = calculateSwipeSteps(
      dx,
      performance.now() - startTouch.startedAt,
      maxStart
    );
    animateWindowTo(
      boundedWindowStart(windowStart, swipeDirection(dx) * steps, maxStart)
    );
  }
  const grouped = new Map<
    string,
    Array<{
      week: string;
      score: number;
      attempts: number;
      delta: number | null;
    }>
  >();
  for (const point of visibleSeries.reverse()) {
    const trends = point.skillTrends ? parseSkillTrends(point.skillTrends) : [];
    for (const trend of trends) {
      const values = grouped.get(trend.skill) || [];
      const previous = values[values.length - 1];
      values.push({
        week: new Date(point.weekStart).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        score: trend.score,
        attempts: trend.attempts,
        delta: previous ? trend.score - previous.score : null,
      });
      grouped.set(trend.skill, values);
    }
  }
  const skills = Array.from(grouped.entries()).slice(0, 4);
  return (
    <div
      data-testid="skill-trend-chart"
      aria-label="Interactive skill trend chart"
      className="rounded-2xl border border-slate-200 bg-white p-4"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
            Skill progress over time
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Hover or use arrow keys · swipe to move · pinch to zoom
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextZoom = Math.max(1, zoom - 1);
              setZoom(nextZoom);
              setWindowStart(0);
              setAnnouncement(
                `Zoom ${nextZoom} times. Showing chart window 1 of ${maxStart + 1}.`
              );
            }}
            aria-label="Zoom out trend chart"
          >
            −
          </Button>
          <span className="min-w-16 text-center text-xs text-slate-600">
            {zoom}× zoom
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextZoom = Math.min(4, zoom + 1);
              setZoom(nextZoom);
              setWindowStart(0);
              setAnnouncement(
                `Zoom ${nextZoom} times. Showing chart window 1 of ${maxStart + 1}.`
              );
            }}
            aria-label="Zoom in trend chart"
          >
            +
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setZoom(1);
              animateWindowTo(0);
              setHovered(null);
              setAnnouncement("Chart view reset to 1 times zoom and window 1.");
            }}
            aria-label="Reset trend chart view"
          >
            Reset view
          </Button>
          <TrendingUp size={18} className="ml-2 text-emerald-700" />
        </div>
      </div>
      <div
        className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-600"
        aria-label="Peer confidence legend"
      >
        <span className="font-semibold text-slate-700">Peer confidence</span>
        <span>
          <strong className="text-emerald-700">High</strong> · 10+ peers
        </span>
        <span>
          <strong className="text-amber-700">Medium</strong> · 5–9 peers
        </span>
        <span>
          <strong className="text-rose-700">Low</strong> · 1–4 peers
        </span>
        <span className="ml-auto">
          Window {maxStart ? Math.min(windowStart + 1, maxStart + 1) : 1}/
          {maxStart + 1}
        </span>
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div
        data-testid="chart-range-position"
        data-window={`${Math.min(windowStart, maxStart) + 1}`}
        role="progressbar"
        aria-label="Chart range position"
        aria-valuemin={1}
        aria-valuemax={maxStart + 1}
        aria-valuenow={Math.min(windowStart, maxStart) + 1}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-cyan-600 transition-all duration-300"
          style={{
            width: `${((Math.min(windowStart, maxStart) + 1) / (maxStart + 1)) * 100}%`,
          }}
        />
      </div>
      {skills.length ? (
        <div className="mt-4 space-y-5">
          {skills.map(([skill, values]) => {
            const peer = peerAverages.find(item => item.skill === skill);
            return (
              <div key={skill}>
                <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-800">{skill}</span>
                  <span className="text-slate-600">
                    {values[values.length - 1]?.score}/10 latest · peer{" "}
                    {peer?.score ?? "—"}{" "}
                    {peer
                      ? `· n=${peer.sampleSize ?? 0} · ${peer.confidence ?? "low"} confidence`
                      : ""}
                  </span>
                </div>
                <div className="relative">
                  <div className="flex items-end gap-2">
                    {values.map((value, index) => (
                      <div
                        key={`${skill}-${value.week}`}
                        className="relative flex-1 outline-none"
                        tabIndex={0}
                        onMouseEnter={() => setHovered({ skill, ...value })}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered({ skill, ...value })}
                        onBlur={() => setHovered(null)}
                        onKeyDown={event => {
                          if (
                            event.key !== "ArrowLeft" &&
                            event.key !== "ArrowRight"
                          )
                            return;
                          event.preventDefault();
                          const next = Math.max(
                            0,
                            Math.min(
                              values.length - 1,
                              index + (event.key === "ArrowRight" ? 1 : -1)
                            )
                          );
                          setHovered({ skill, ...values[next] });
                          (
                            event.currentTarget.parentElement?.children[
                              next
                            ] as HTMLElement | undefined
                          )?.focus();
                        }}
                      >
                        <div className="h-16 rounded-t-lg bg-slate-100 p-1">
                          <div
                            className="h-full rounded-md bg-emerald-500 transition-all"
                            style={{
                              height: `${Math.max(8, value.score * 10)}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 truncate text-[10px] text-slate-600">
                          {value.week}
                        </p>
                        {hovered?.skill === skill &&
                          hovered.week === value.week && (
                            <div className="absolute bottom-full left-1/2 z-20 mb-2 w-36 -translate-x-1/2 rounded-lg bg-slate-950 p-2 text-[11px] text-white shadow-lg">
                              <p className="font-semibold">{value.week}</p>
                              <p>Score: {value.score}/10</p>
                              <p>Attempts: {value.attempts}</p>
                              <p
                                className={
                                  value.delta === null
                                    ? "text-slate-300"
                                    : value.delta >= 0
                                      ? "text-lime-300"
                                      : "text-rose-300"
                                }
                              >
                                {value.delta === null
                                  ? "First saved point"
                                  : `${value.delta >= 0 ? "+" : ""}${value.delta} vs prior`}
                              </p>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                  {peer && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-cyan-600"
                      style={{ bottom: `${peer.score * 10}%` }}
                    >
                      <span className="absolute -top-5 right-0 rounded bg-cyan-50 px-1 text-[10px] font-medium text-cyan-700">
                        Peer {peer.score}/10 · n={peer.sampleSize ?? 0} ·{" "}
                        {peer.confidence ?? "low"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          Generate a weekly summary after practicing to populate your trend
          chart.
        </p>
      )}
    </div>
  );
}
function parseSkillTrends(
  value: string
): Array<{ skill: string; score: number; attempts: number }> {
  try {
    return JSON.parse(value) as Array<{
      skill: string;
      score: number;
      attempts: number;
    }>;
  } catch {
    return [];
  }
}

function AnalyticsExportButton() {
  const exportCsv = trpc.analytics.exportCsv.useQuery(undefined, {
    enabled: false,
  });
  async function download() {
    const result = await exportCsv.refetch();
    if (!result.data) return;
    const url = URL.createObjectURL(
      new Blob([result.data], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `global-ai-coach-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={download}
      disabled={exportCsv.isFetching}
    >
      <Download size={15} className="mr-2" />
      {exportCsv.isFetching ? "Preparing…" : "Export CSV"}
    </Button>
  );
}

function SourceRefreshHistory({
  status,
  runs,
}: {
  status?: SourceRefreshStatus;
  runs: SourceRefreshRun[];
}) {
  return (
    <Card className="mt-6 overflow-hidden">
      <CardHeader className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">
              Official-source refresh history
            </CardTitle>
            <CardDescription>
              Durable execution evidence for source monitoring. A skipped run
              means another instance held the lease.
            </CardDescription>
          </div>
          <Badge
            variant={
              status?.latestRun?.status === "succeeded"
                ? "secondary"
                : "outline"
            }
          >
            {status?.latestRun?.status || "No runs"}
          </Badge>
        </div>
        <p className="pt-2 text-sm text-slate-600">
          Last fully successful refresh:{" "}
          {formatRefreshDate(status?.lastSuccessfulRefreshAt)}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {runs.length === 0 ? (
          <p className="p-6 text-sm text-slate-600">
            No refresh executions have been recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">
                Recent official-source refresh executions
              </caption>
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Run
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Started
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Checked
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Changed
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Errors
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Skipped
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map(run => (
                  <tr key={run.runId} className="text-slate-700">
                    <td className="px-6 py-3 font-mono text-xs">
                      <span className="block">{run.runId.slice(0, 12)}…</span>
                      <span className="text-slate-400">{run.triggerType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          run.status === "succeeded" ? "secondary" : "outline"
                        }
                      >
                        {run.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatRefreshDate(run.startedAt)}
                    </td>
                    <td className="px-4 py-3">{run.checked}</td>
                    <td className="px-4 py-3">{run.changed}</td>
                    <td className="px-4 py-3">{run.errors}</td>
                    <td className="px-6 py-3">{run.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatRefreshDate(value?: Date | string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-widest text-slate-600">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

type AnalyticsData = {
  totalEvents: number;
  uniqueUsers: number;
  completionRate: number;
  retentionCohorts: Array<{
    cohort: string;
    users: number;
    weeks: Array<{ week: number; retained: number; rate: number }>;
  }>;
  skillTrends: Array<{
    skill: string;
    week: string;
    attempts: number;
    overall: number;
    communication: number;
    confidence: number;
    technical: number;
    timeManagement: number;
  }>;
  coachQuality: Array<{
    coachType: string;
    attempts: number;
    overall: number;
    communication: number;
    confidence: number;
    technical: number;
    timeManagement: number;
  }>;
};
type SourceRefreshRun = {
  runId: string;
  triggerType: string;
  status: string;
  startedAt: Date | string;
  completedAt: Date | string | null;
  checked: number;
  changed: number;
  errors: number;
  skipped: number;
  errorMessage: string | null;
  lastSuccessfulRefreshAt: Date | string | null;
};
type SourceRefreshStatus = {
  latestRun: SourceRefreshRun | null;
  lastSuccessfulRefreshAt: Date | string | null;
};
type RecommendedModule = {
  title: string;
  reason: string;
  action: string;
  skill: string;
  score: number;
};
function parseRecommendedModules(value?: string | null): RecommendedModule[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as RecommendedModule[];
  } catch {
    return [];
  }
}

type JsonQuestion = {
  question?: string;
  context?: string;
  hints?: string[];
  evaluationCriteria?: string[];
  estimatedMinutes?: number;
  coachType?: string;
  rubric?: string;
  jurisdictionNotes?: string;
};
type JsonFeedback = {
  overallScore?: number;
  communicationScore?: number;
  confidenceScore?: number;
  timeManagementScore?: number;
  strengths?: string[];
  improvements?: string[];
  detailedFeedback?: string;
  rubric?: string;
  jurisdictionNotes?: string;
};
