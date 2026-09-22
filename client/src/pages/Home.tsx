import { useEffect, useMemo, useState } from "react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowRight, BarChart3, Bell, BrainCircuit, Check, Clock3, Download, Globe2, LoaderCircle, MessageSquare, RotateCcw, Save, Settings2, Share2, Sparkles, Target, Timer, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

type Goal = "tech-interview" | "behavioral" | "system-design";
type Timeline = "3-days" | "1-week" | "2-weeks" | "1-month" | "3-months";
type ProfileDraft = { preferredLanguage: string; country: string; targetRole: string; experienceLevel: string; weeklyMinutes: number };

const goals: Array<{ id: Goal; title: string; description: string; icon: typeof BrainCircuit; tag?: string }> = [
  { id: "tech-interview", title: "Technical interview", description: "Algorithms, coding, and engineering judgment", icon: BrainCircuit, tag: "Popular" },
  { id: "behavioral", title: "Behavioral interview", description: "Stories, leadership, and communication", icon: MessageSquare },
  { id: "system-design", title: "System design", description: "Architecture, scale, and trade-offs", icon: Target, tag: "Advanced" },
];
const timelines: Array<{ id: Timeline; title: string; detail: string; color: string }> = [
  { id: "3-days", title: "3 days", detail: "Emergency sprint", color: "bg-rose-500" },
  { id: "1-week", title: "1 week", detail: "Intensive", color: "bg-amber-500" },
  { id: "2-weeks", title: "2 weeks", detail: "Focused", color: "bg-yellow-400" },
  { id: "1-month", title: "1 month", detail: "Comprehensive", color: "bg-emerald-500" },
  { id: "3-months", title: "3+ months", detail: "Mastery", color: "bg-sky-500" },
];
const features = [
  { icon: Timer, title: "Dynamic calibration", text: "Your plan changes with your deadline, performance, and available energy." },
  { icon: Globe2, title: "Global context", text: "Practice with respectful guidance for different cultures, roles, and jurisdictions." },
  { icon: TrendingUp, title: "Feedback that compounds", text: "Every answer becomes a sharper next question and a more useful next step." },
];

const emptyProfile: ProfileDraft = { preferredLanguage: "en", country: "", targetRole: "", experienceLevel: "", weeklyMinutes: 300 };

export default function Home() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [session, setSession] = useState<{ sessionId: number; sessions: number; focus: string; difficulty: string; mode: string; interviewType: Goal; timeline: Timeline } | null>(null);
  const [question, setQuestion] = useState<JsonQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<JsonFeedback | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfile);

  const { user, isAuthenticated } = useAuth();
  const progressQuery = trpc.profile.progress.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const weeklySummary = trpc.profile.weeklySummary.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const weeklyComparison = trpc.profile.weeklyComparison.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const generateWeeklySummary = trpc.profile.generateWeeklySummary.useMutation({ onSuccess: () => void weeklySummary.refetch() });
  const analyticsSummary = trpc.analytics.summary.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const profileSave = trpc.profile.save.useMutation({ onSuccess: () => void progressQuery.refetch() });
  const start = trpc.coach.start.useMutation({ onSuccess: (data) => { setSession(data); setStartedAt(Date.now()); void progressQuery.refetch(); } });
  const generate = trpc.coach.question.useMutation({ onSuccess: (data) => { setQuestion(data); setFeedback(null); setAnswer(""); setStartedAt(Date.now()); } });
  const evaluate = trpc.coach.evaluate.useMutation({ onSuccess: (data) => { setFeedback(data); void progressQuery.refetch(); } });

  useEffect(() => {
    const profile = progressQuery.data?.profile;
    if (profile) setProfileDraft({ preferredLanguage: profile.preferredLanguage || "en", country: profile.country || "", targetRole: profile.targetRole || "", experienceLevel: profile.experienceLevel || "", weeklyMinutes: profile.weeklyMinutes || 300 });
  }, [progressQuery.data?.profile]);

  const selectedGoal = useMemo(() => goals.find((item) => item.id === goal), [goal]);
  const selectedTimeline = useMemo(() => timelines.find((item) => item.id === timeline), [timeline]);
  const updateProfile = (key: keyof ProfileDraft, value: string | number) => setProfileDraft((current) => ({ ...current, [key]: value }));

  function saveProfile() { profileSave.mutate(profileDraft); }
  function downloadWeeklyPdf() {
    const summary = weeklySummary.data;
    if (!summary) return;
    const pdf = new jsPDF();
    pdf.setFontSize(22);
    pdf.text("Global AI Coach", 20, 24);
    pdf.setFontSize(16);
    pdf.text("Weekly Progress Summary", 20, 36);
    pdf.setFontSize(11);
    pdf.setTextColor(90, 100, 115);
    pdf.text(`Week starting: ${new Date(summary.weekStart).toLocaleDateString()}`, 20, 48);
    pdf.setTextColor(20, 30, 45);
    pdf.setFontSize(13);
    pdf.text(`Practice attempts: ${summary.attempts}`, 20, 70);
    pdf.text(`Minutes practiced: ${summary.minutesPracticed}`, 20, 82);
    pdf.text(`Average score: ${summary.averageScore}/10`, 20, 94);
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(summary.summaryText, 170);
    pdf.text(lines, 20, 110);
    const skillTrends = summary.skillTrends ? JSON.parse(summary.skillTrends) as Array<{ skill: string; score: number; attempts: number }> : [];
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
    pdf.text(summary.retentionRate === null ? "No previous-week baseline" : "Returned from the previous week", 70, retentionY + 27);
    pdf.setTextColor(90, 100, 115);
    pdf.text("Generated by Global AI Coach", 20, 280);
    pdf.save(`global-ai-coach-weekly-summary-${new Date(summary.weekStart).toISOString().slice(0, 10)}.pdf`);
    toast.success("Weekly summary PDF downloaded");
  }
  async function shareWeeklySummary() {
    const summary = weeklySummary.data;
    if (!summary) return;
    const text = `My Global AI Coach weekly progress: ${summary.attempts} attempts, ${summary.minutesPracticed} minutes practiced, average score ${summary.averageScore}/10.`;
    const share = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (share.share) {
      await share.share({ title: "My weekly coaching progress", text, url: window.location.href });
      toast.success("Weekly summary shared");
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent("My Global AI Coach progress")}&body=${encodeURIComponent(`${text}

Open Global AI Coach: ${window.location.href}`)}`;
      toast.success("Email composer opened");
    }
  }
  function begin() {
    if (!isAuthenticated) { startLogin(); return; }
    if (goal && timeline) { profileSave.mutate({ ...profileDraft, targetRole: profileDraft.targetRole || selectedGoal?.title, weeklyMinutes: profileDraft.weeklyMinutes }); start.mutate({ interviewType: goal, timeline }); }
  }
  function reset() { setSession(null); setQuestion(null); setFeedback(null); setAnswer(""); setGoal(null); setTimeline(null); }

  if (session) {
    const completed = progressQuery.data?.totals.attempts ?? (feedback ? 1 : 0);
    const progress = Math.min(100, Math.round((completed / session.sessions) * 100));
    return <main className="min-h-screen bg-[#f6f8fb] text-slate-900"><nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><button className="flex items-center gap-3" onClick={reset} aria-label="Back to home"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-lime-300"><Sparkles size={19} /></span><span className="font-semibold tracking-tight">Global AI Coach</span></button><div className="flex items-center gap-3"><Badge variant="secondary">{session.mode}</Badge><Button variant="ghost" onClick={reset}><RotateCcw size={16} className="mr-2" /> New plan</Button></div></nav><section className="mx-auto max-w-7xl px-6 pb-16 pt-8"><div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Your coaching room</p><h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-6xl">Train with intent.</h1><p className="mt-3 max-w-2xl text-slate-600">{selectedGoal?.title} · {selectedTimeline?.title} · {session.focus}</p></div><div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs uppercase tracking-widest text-slate-500">Current mode</p><p className="mt-1 font-semibold">{session.difficulty} calibration</p></div></div><div className="grid gap-5 md:grid-cols-3"><Card><CardHeader><CardDescription>Readiness</CardDescription><CardTitle>{progress}%</CardTitle></CardHeader><CardContent><Progress value={progress} /><p className="mt-3 text-sm text-slate-500">{completed} of {session.sessions} practices completed</p></CardContent></Card><Card><CardHeader><CardDescription>Plan</CardDescription><CardTitle>{session.sessions} sessions</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">Calibrated for your {selectedTimeline?.title} timeline.</p></CardContent></Card><Card><CardHeader><CardDescription>Coach signal</CardDescription><CardTitle className="text-2xl">{feedback ? `${feedback.overallScore}/10` : progressQuery.data?.totals.averageScore ? `${progressQuery.data.totals.averageScore}/10` : "Ready"}</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">{feedback ? "Feedback captured" : "Pick a focused drill below"}</p></CardContent></Card></div>{isAuthenticated && <Card className="mt-6 border-lime-200 bg-lime-50"><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Bell size={16} className="text-emerald-700" /> Weekly progress summary</p>{weeklySummary.data ? <><p className="mt-2 text-sm leading-6 text-slate-600">{weeklySummary.data.summaryText}</p><p className="mt-2 text-xs text-slate-500">{weeklySummary.data.attempts} attempts · {weeklySummary.data.minutesPracticed} minutes · {weeklySummary.data.averageScore}/10 · {weeklySummary.data.retentionRate ?? 0}% retention</p><div className="mt-4 rounded-2xl border border-lime-200 bg-white/70 p-4"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">AI-recommended coaching modules</p><div className="mt-3 grid gap-3 md:grid-cols-3">{parseRecommendedModules(weeklySummary.data.recommendedModules).map((module) => <div key={module.title} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{module.title}</p><Badge variant="secondary">{module.score}/10</Badge></div><p className="mt-1 text-xs leading-5 text-slate-600">{module.reason}</p><p className="mt-2 text-xs font-medium text-emerald-700">Next: {module.action}</p></div>)}</div></div></> : <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Your weekly report is ready to generate. Create it after a practice session to see activity, time, scores, skill trends, and retention in one place.</p>}</div><div className="flex shrink-0 flex-wrap gap-2">{weeklySummary.data && <><Button variant="outline" size="sm" onClick={() => void shareWeeklySummary()}><Share2 size={15} className="mr-2" /> Share</Button><Button variant="outline" size="sm" onClick={downloadWeeklyPdf}><Download size={15} className="mr-2" /> PDF report</Button></>}<Button size="sm" onClick={() => generateWeeklySummary.mutate()} disabled={generateWeeklySummary.isPending}>{generateWeeklySummary.isPending ? <><LoaderCircle size={15} className="mr-2 animate-spin" /> Generating…</> : weeklySummary.data ? "Refresh summary" : "Generate summary"}</Button></div></div>{weeklySummary.data && weeklyComparison.data && <div className="mt-5 grid gap-3 rounded-2xl border border-lime-200 bg-white/60 p-4 text-sm md:grid-cols-3"><div><p className="text-xs uppercase tracking-widest text-slate-500">Previous weeks</p><p className="mt-1 font-semibold text-slate-900">{weeklyComparison.data.previousWeeks.length ? `${weeklyComparison.data.previousWeeks[0]?.averageScore}/10 latest` : "No baseline yet"}</p><p className="text-xs text-slate-500">{weeklyComparison.data.previousWeeks.length} saved comparison weeks</p></div><div><p className="text-xs uppercase tracking-widest text-slate-500">Peer average</p><p className="mt-1 font-semibold text-slate-900">{weeklyComparison.data.peerAverageScore || "—"}/10</p><p className="text-xs text-slate-500">Aggregated, not individually identified</p></div><div><p className="text-xs uppercase tracking-widest text-slate-500">Time benchmark</p><p className="mt-1 font-semibold text-slate-900">{weeklyComparison.data.peerAverageMinutes || "—"} min</p><p className="text-xs text-slate-500">Compared with anonymized summaries</p></div></div>}{generateWeeklySummary.isPending && <div className="mt-5" aria-live="polite"><div className="mb-2 flex justify-between text-xs font-medium text-slate-600"><span>Calculating your weekly progress</span><span>Processing</span></div><div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-2 w-2/3 animate-pulse rounded-full bg-emerald-600 transition-all" /></div></div>}</CardContent></Card>}{!question && !feedback && <Card className="mt-6 overflow-hidden border-0 bg-slate-950 text-white"><CardContent className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12"><div><Badge className="mb-4 bg-lime-300 text-slate-950">Next best action</Badge><h2 className="max-w-xl text-3xl font-semibold tracking-tight">Turn your weakest signal into your next advantage.</h2><p className="mt-3 max-w-xl text-slate-300">The coach will generate a realistic prompt, then evaluate your answer against clarity, confidence, technical judgment, and time.</p></div><Button className="bg-lime-300 text-slate-950 hover:bg-lime-200" size="lg" onClick={() => generate.mutate({ sessionId: session.sessionId, interviewType: session.interviewType, difficulty: session.difficulty, focus: session.focus })} disabled={generate.isPending}>{generate.isPending ? "Generating…" : "Generate practice"}<ArrowRight size={17} className="ml-2" /></Button></CardContent></Card>}{question && !feedback && <Card className="mt-6"><CardHeader><div className="flex items-center justify-between gap-4"><div><CardDescription>Practice prompt · {question.estimatedMinutes || 15} minutes</CardDescription><CardTitle className="mt-2 max-w-3xl text-2xl">{question.question || "Your personalized practice question"}</CardTitle></div><Badge variant="outline">{question.coachType === "ai" ? "OpenRouter AI" : "Resilient fallback"}</Badge></div></CardHeader><CardContent><div className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-3"><span><strong className="text-slate-900">Context:</strong> {question.context}</span><span><strong className="text-slate-900">Hint:</strong> {question.hints?.[0]}</span><span><strong className="text-slate-900">Criteria:</strong> {question.evaluationCriteria?.join(", ")}</span></div>{(question.rubric || question.jurisdictionNotes) && <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 md:grid-cols-2"><span><strong className="text-slate-900">Role rubric:</strong> {question.rubric}</span><span><strong className="text-slate-900">Jurisdiction context:</strong> {question.jurisdictionNotes}</span></div>}<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-48 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10" placeholder="Write your answer as if you were in the real room…" /><div className="mt-4 flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-sm text-slate-500"><Clock3 size={15} /> {startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : 1} min elapsed</span><Button onClick={() => evaluate.mutate({ sessionId: session.sessionId, question: question.question || "Practice interview question", answer, interviewType: session.interviewType, timeTaken: Math.max(1, Math.round((Date.now() - (startedAt || Date.now())) / 60000)) })} disabled={!answer.trim() || evaluate.isPending}>{evaluate.isPending ? "Reviewing…" : "Get feedback"}<Sparkles size={16} className="ml-2" /></Button></div></CardContent></Card>}{feedback && <Card className="mt-6"><CardHeader><div className="flex items-center justify-between"><div><CardDescription>Coach review</CardDescription><CardTitle className="mt-2 text-3xl">Good first rep. Now sharpen it.</CardTitle></div><div className="grid h-20 w-20 place-items-center rounded-full bg-lime-100 text-2xl font-semibold text-slate-950">{feedback.overallScore}</div></div></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3">{[["Communication", feedback.communicationScore], ["Confidence", feedback.confidenceScore], ["Time", feedback.timeManagementScore]].map(([label, value]) => <div key={label as string} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}/10</p></div>)}</div><div className="mt-6 grid gap-6 md:grid-cols-2"><div><h3 className="font-semibold">What worked</h3><ul className="mt-3 space-y-2 text-sm text-slate-600">{feedback.strengths?.map((item) => <li key={item} className="flex gap-2"><Check size={16} className="mt-0.5 text-emerald-600" />{item}</li>)}</ul></div><div><h3 className="font-semibold">Next improvement</h3><ul className="mt-3 space-y-2 text-sm text-slate-600">{feedback.improvements?.map((item) => <li key={item} className="flex gap-2"><Zap size={16} className="mt-0.5 text-amber-500" />{item}</li>)}</ul></div></div><div className="mt-6 rounded-2xl bg-slate-950 p-5 text-slate-200"><p className="text-sm leading-6">{feedback.detailedFeedback}</p></div><Button className="mt-6" onClick={() => { setQuestion(null); setFeedback(null); setAnswer(""); }}>Continue training<ArrowRight size={16} className="ml-2" /></Button></CardContent></Card>}</section></main>;
  }

  const profileForm = isAuthenticated && <Card className="mb-12 border-slate-200"><CardHeader><CardDescription><Settings2 size={15} className="mr-2 inline" /> Personal calibration</CardDescription><CardTitle>Make the coach more relevant</CardTitle><p className="text-sm text-slate-500">These settings shape language, context, target role, and recommended weekly load.</p></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-5"><label className="text-sm text-slate-600">Language<select value={profileDraft.preferredLanguage} onChange={(e) => updateProfile("preferredLanguage", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900"><option value="en">English</option><option value="es">Spanish</option><option value="de">German</option><option value="fr">French</option><option value="ar">Arabic</option><option value="hi">Hindi</option></select></label><label className="text-sm text-slate-600">Country<input value={profileDraft.country} onChange={(e) => updateProfile("country", e.target.value)} placeholder="e.g. Sweden" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900" /></label><label className="text-sm text-slate-600">Target role<input value={profileDraft.targetRole} onChange={(e) => updateProfile("targetRole", e.target.value)} placeholder="e.g. Product manager" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900" /></label><label className="text-sm text-slate-600">Experience<select value={profileDraft.experienceLevel} onChange={(e) => updateProfile("experienceLevel", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900"><option value="">Choose level</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></label><label className="text-sm text-slate-600">Weekly minutes<input type="number" min="0" max="10000" value={profileDraft.weeklyMinutes} onChange={(e) => updateProfile("weeklyMinutes", Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900" /></label></div><Button className="mt-5" onClick={saveProfile} disabled={profileSave.isPending}><Save size={16} className="mr-2" />{profileSave.isPending ? "Saving…" : "Save profile"}</Button></CardContent></Card>;

  return <main className="min-h-screen overflow-hidden bg-[#f6f8fb] text-slate-900"><nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-lime-300"><Sparkles size={19} /></span><span className="font-semibold tracking-tight">Global AI Coach</span></div><div className="hidden items-center gap-6 text-sm text-slate-500 md:flex"><span>Adaptive training</span><span>Global context</span><span>Real-time feedback</span></div><div className="flex items-center gap-3">{isAuthenticated && <Badge variant="secondary">{user?.name || "Signed in"}</Badge>}<Badge variant="secondary"><Globe2 size={14} className="mr-1" /> Global</Badge></div></nav><section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-12 md:grid-cols-[1.12fr_0.88fr] md:items-center md:pt-24"><div><Badge className="mb-6 bg-lime-200 text-slate-900 hover:bg-lime-200"><Sparkles size={14} className="mr-1" /> Your unfair practice advantage</Badge><h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] md:text-7xl">Train for the moment that matters.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">A personal AI coach for high-stakes interviews, exams, and tasks. It adapts the plan to your deadline, challenges your thinking, and gives you a clear next move.</p><div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-500"><span className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> Emergency to mastery plans</span><span className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> Multilingual-ready</span></div></div><div className="relative rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 md:p-8"><div className="relative"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">A coach that calibrates</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-lime-200">LIVE LOOP</span></div><div className="mt-10 space-y-4"><div className="rounded-2xl bg-white/10 p-4"><div className="flex items-center justify-between text-sm"><span>Time available</span><span className="text-lime-300">3 days</span></div><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 w-1/4 rounded-full bg-lime-300" /></div></div><div className="rounded-2xl bg-white/10 p-4"><div className="flex items-center justify-between text-sm"><span>Focus signal</span><span className="text-lime-300">Communication</span></div><div className="mt-3 flex gap-2"><span className="rounded-full bg-lime-300 px-3 py-1 text-xs text-slate-950">Clarity</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-400">Evidence</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-400">Timing</span></div></div><div className="rounded-2xl border border-lime-300/30 bg-lime-300/10 p-4"><p className="text-sm text-slate-300">Next best action</p><p className="mt-2 font-medium">Practice one high-frequency question under a timer.</p></div></div></div></div></section><section className="mx-auto max-w-7xl px-6 pb-16">{profileForm}<div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Build your plan</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">What are you preparing for?</h2></div><p className="hidden max-w-sm text-right text-sm text-slate-500 md:block">Choose the goal and the clock. The system does the calibration.</p></div><div className="grid gap-4 md:grid-cols-3">{goals.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setGoal(item.id)} className="text-left transition duration-200 hover:-translate-y-1"><Card className={`h-full transition ${goal === item.id ? "border-slate-950 bg-slate-950 text-white shadow-xl" : "hover:shadow-xl"}`}><CardHeader><div className="flex items-center justify-between"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${goal === item.id ? "bg-lime-300 text-slate-950" : "bg-slate-100 text-slate-900"}`}><Icon size={21} /></span>{item.tag && <Badge variant={goal === item.id ? "default" : "secondary"}>{item.tag}</Badge>}</div><CardTitle className="mt-4 text-xl">{item.title}</CardTitle><CardDescription className={goal === item.id ? "text-slate-300" : ""}>{item.description}</CardDescription></CardHeader></Card></button>; })}</div>{goal && <div className="mt-12"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Step 2</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">How much time do you have?</h2></div><span className="text-sm text-slate-500">Selected: {selectedGoal?.title}</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{timelines.map((item) => <button key={item.id} onClick={() => setTimeline(item.id)} className={`rounded-2xl border bg-white p-4 text-left transition ${timeline === item.id ? "border-slate-950 bg-slate-950 text-white shadow-xl" : "border-slate-200 hover:-translate-y-1 hover:shadow-lg"}`}><span className={`mb-6 block h-3 w-3 rounded-full ${item.color}`} /><p className="font-semibold">{item.title}</p><p className={`mt-1 text-sm ${timeline === item.id ? "text-slate-300" : "text-slate-500"}`}>{item.detail}</p></button>)}</div></div>}{goal && timeline && <div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-3xl bg-lime-300 p-6 md:flex-row md:items-center md:p-8"><div><p className="text-sm font-semibold uppercase tracking-widest text-slate-700">Ready when you are</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{selectedGoal?.title} · {selectedTimeline?.title}</h3><p className="mt-1 text-slate-700">Your plan will prioritize the highest-value practice first.</p></div><Button size="lg" className="bg-slate-950 text-white hover:bg-slate-800" onClick={begin} disabled={start.isPending}>{start.isPending ? "Calibrating…" : isAuthenticated ? "Start my coaching plan" : "Sign in to start"}<ArrowRight size={17} className="ml-2" /></Button></div>}</section><section className="border-y border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3">{features.map((item) => { const Icon = item.icon; return <div key={item.title}><Icon size={22} className="text-slate-900" /><h3 className="mt-4 font-semibold">{item.title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{item.text}</p></div>; })}</div></section>{user?.role === "admin" && analyticsSummary.data && <AdminAnalytics data={analyticsSummary.data} />}</main>;
}

function AdminAnalytics({ data }: { data: AnalyticsData }) {
  const skills = Array.from(new Set(data.skillTrends.map((item) => item.skill)));
  const latestBySkill = skills.map((skill) => data.skillTrends.filter((item) => item.skill === skill).slice(-1)[0]).filter(Boolean);
  return <section className="border-t border-slate-200 bg-slate-50"><div className="mx-auto max-w-7xl px-6 py-12"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500"><BarChart3 size={15} className="mr-2 inline" /> Admin control room</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Behavior, retention, and coach quality</h2></div><Badge variant="secondary">Observed data only</Badge></div><div className="mt-8 grid gap-4 md:grid-cols-4"><Metric label="Events" value={String(data.totalEvents)} /><Metric label="Unique users" value={String(data.uniqueUsers)} /><Metric label="Completion" value={`${data.completionRate}%`} /><Metric label="Cohorts" value={String(data.retentionCohorts.length)} /></div><div className="mt-6 grid gap-6 lg:grid-cols-3"><Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-xl">Retention cohorts</CardTitle><CardDescription>Weekly active return rate by signup cohort.</CardDescription></div><AnalyticsExportButton /></div></CardHeader><CardContent className="space-y-4">{data.retentionCohorts.slice(-4).map((cohort) => <div key={cohort.cohort}><div className="flex justify-between text-sm"><span>{cohort.cohort}</span><span>{cohort.users} users</span></div><div className="mt-2 grid grid-cols-5 gap-1">{cohort.weeks.map((week) => <div key={week.week} title={`${week.rate}% retained`} className="h-8 rounded bg-slate-100 p-1 text-center text-[10px] text-slate-600" style={{ backgroundColor: `rgba(163, 230, 53, ${Math.max(0.12, week.rate / 100)})` }}>W{week.week}<br />{week.rate}%</div>)}</div></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-xl">Skill score trends</CardTitle><CardDescription>Latest overall and dimension scores.</CardDescription></CardHeader><CardContent className="space-y-3">{latestBySkill.map((item) => <div key={item.skill} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between"><span className="font-medium">{item.skill}</span><span className="font-semibold">{item.overall}/10</span></div><div className="mt-2 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-slate-950" style={{ width: `${item.overall * 10}%` }} /></div><p className="mt-2 text-xs text-slate-500">Technical {item.technical} · Communication {item.communication} · Confidence {item.confidence}</p></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-xl">Coach-quality comparison</CardTitle><CardDescription>Observed scores by provider path.</CardDescription></CardHeader><CardContent className="space-y-3">{data.coachQuality.map((item) => <div key={item.coachType} className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><div><p className="font-medium">{item.coachType}</p><p className="text-xs text-slate-500">{item.attempts} attempts · comm {item.communication}</p></div><Badge variant={item.coachType === "ai" ? "default" : "secondary"}>{item.overall}/10</Badge></div>)}</CardContent></Card></div></div></section>;
}
function AnalyticsExportButton() {
  const exportCsv = trpc.analytics.exportCsv.useQuery(undefined, { enabled: false });
  async function download() {
    const result = await exportCsv.refetch();
    if (!result.data) return;
    const url = URL.createObjectURL(new Blob([result.data], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `global-ai-coach-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <Button variant="outline" size="sm" onClick={download} disabled={exportCsv.isFetching}><Download size={15} className="mr-2" />{exportCsv.isFetching ? "Preparing…" : "Export CSV"}</Button>;
}

function Metric({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></CardContent></Card>; }

type AnalyticsData = { totalEvents: number; uniqueUsers: number; completionRate: number; retentionCohorts: Array<{ cohort: string; users: number; weeks: Array<{ week: number; retained: number; rate: number }> }>; skillTrends: Array<{ skill: string; week: string; attempts: number; overall: number; communication: number; confidence: number; technical: number; timeManagement: number }>; coachQuality: Array<{ coachType: string; attempts: number; overall: number; communication: number; confidence: number; technical: number; timeManagement: number }> };
type RecommendedModule = { title: string; reason: string; action: string; skill: string; score: number };
function parseRecommendedModules(value?: string | null): RecommendedModule[] {
  if (!value) return [];
  try { return JSON.parse(value) as RecommendedModule[]; } catch { return []; }
}

type JsonQuestion = { question?: string; context?: string; hints?: string[]; evaluationCriteria?: string[]; estimatedMinutes?: number; coachType?: string; rubric?: string; jurisdictionNotes?: string };
type JsonFeedback = { overallScore?: number; communicationScore?: number; confidenceScore?: number; timeManagementScore?: number; strengths?: string[]; improvements?: string[]; detailedFeedback?: string; rubric?: string; jurisdictionNotes?: string };
