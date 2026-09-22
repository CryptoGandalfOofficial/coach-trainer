from pathlib import Path
p = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx')
s = p.read_text()
s = s.replace('import { useEffect, useMemo, useState } from "react";', 'import { useEffect, useMemo, useRef, useState } from "react";', 1)
s = s.replace('import { toast } from "sonner";\n', 'import { toast } from "sonner";\nimport html2canvas from "html2canvas";\n', 1)
s = s.replace('  const [peerFilters, setPeerFilters] = useState({ role: "", country: "", experienceLevel: "" });\n', '  const [peerFilters, setPeerFilters] = useState({ role: "", country: "", experienceLevel: "" });\n  const [modulePrefs, setModulePrefs] = useState<Record<string, { difficulty: "beginner" | "intermediate" | "advanced" | "expert"; duration: number }>>({});\n  const [trendRange, setTrendRange] = useState<"4" | "8">("8");\n  const chartRef = useRef<HTMLDivElement>(null);\n', 1)
s = s.replace('  function acceptModule(module: RecommendedModule) {\n    const interviewType: Goal = module.skill === "behavioral" || module.skill === "system-design" || module.skill === "tech-interview" ? module.skill : (goal || "tech-interview");\n    setGoal(interviewType);\n    setTimeline("1-week");\n    profileSave.mutate({ ...profileDraft, targetRole: profileDraft.targetRole || selectedGoal?.title });\n    start.mutate({ interviewType, timeline: "1-week" });\n  }\n', '''  function acceptModule(module: RecommendedModule) {
    const interviewType: Goal = module.skill === "behavioral" || module.skill === "system-design" || module.skill === "tech-interview" ? module.skill : (goal || "tech-interview");
    const preference = modulePrefs[module.title] || { difficulty: "intermediate" as const, duration: 30 };
    setGoal(interviewType);
    setTimeline("1-week");
    profileSave.mutate({ ...profileDraft, targetRole: profileDraft.targetRole || selectedGoal?.title });
    start.mutate({ interviewType, timeline: "1-week", difficultyOverride: preference.difficulty, durationMinutes: preference.duration });
  }
  function setModulePreference(title: string, key: "difficulty" | "duration", value: string) {
    setModulePrefs((current) => ({ ...current, [title]: { ...(current[title] || { difficulty: "intermediate", duration: 30 }), [key]: key === "duration" ? Number(value) : value } as { difficulty: "beginner" | "intermediate" | "advanced" | "expert"; duration: number } }));
  }
  function exportComparisonCsv() {
    const data = weeklyComparison.data;
    if (!data) return;
    const rows = ["weekStart,skill,score,attempts,roleFilter,countryFilter,experienceFilter"];
    for (const point of data.trendSeries) for (const trend of parseSkillTrends(point.skillTrends || "[]")) rows.push([new Date(point.weekStart).toISOString().slice(0, 10), trend.skill, trend.score, trend.attempts, peerFilters.role, peerFilters.country, peerFilters.experienceLevel].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob([rows.join("\\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `global-ai-coach-comparison-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
    toast.success("Filtered comparison CSV downloaded");
  }
  async function exportTrendPng() {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: "#ffffff", scale: 2 });
    const anchor = document.createElement("a"); anchor.href = canvas.toDataURL("image/png"); anchor.download = `global-ai-coach-trends-${trendRange}-weeks.png`; anchor.click();
    toast.success("Trend chart PNG downloaded");
  }
''', 1)
s = s.replace('<p className="mt-2 text-xs font-medium text-emerald-700">Next: {module.action}</p><Button size="sm" className="mt-3 w-full" onClick={() => acceptModule(module)}>Accept module<ArrowRight size={14} className="ml-2" /></Button>', '<p className="mt-2 text-xs font-medium text-emerald-700">Next: {module.action}</p><div className="mt-3 grid grid-cols-2 gap-2"><select aria-label={`${module.title} difficulty`} value={modulePrefs[module.title]?.difficulty || "intermediate"} onChange={(event) => setModulePreference(module.title, "difficulty", event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select><select aria-label={`${module.title} duration`} value={modulePrefs[module.title]?.duration || 30} onChange={(event) => setModulePreference(module.title, "duration", event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900"><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option></select></div><Button size="sm" className="mt-3 w-full" onClick={() => acceptModule(module)}>Accept module<ArrowRight size={14} className="ml-2" /></Button>', 1)
s = s.replace('<SkillTrendChart series={weeklyComparison.data.trendSeries} />', '<div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-600">Chart range</span><select value={trendRange} onChange={(event) => setTrendRange(event.target.value as "4" | "8")} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"><option value="4">Last 4 weeks</option><option value="8">Last 8 weeks</option></select></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={exportComparisonCsv}><Download size={14} className="mr-1" /> CSV</Button><Button variant="outline" size="sm" onClick={() => void exportTrendPng()}><Download size={14} className="mr-1" /> PNG</Button></div></div><div ref={chartRef}><SkillTrendChart series={weeklyComparison.data.trendSeries} range={Number(trendRange)} /></div>', 1)
s = s.replace('function SkillTrendChart({ series }: { series: Array<{ weekStart: Date; skillTrends: string | null }> }) {', 'function SkillTrendChart({ series, range }: { series: Array<{ weekStart: Date; skillTrends: string | null }>; range: number }) {', 1)
s = s.replace('  for (const point of series.slice().reverse()) {', '  for (const point of series.slice(0, range).reverse()) {', 1)
s = s.replace('type RecommendedModule = { title: string; reason: string; action: string; skill: string; score: number };', 'type RecommendedModule = { title: string; reason: string; action: string; skill: string; score: number };', 1)
p.write_text(s)
