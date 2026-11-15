from pathlib import Path

p = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx')
s = p.read_text()
s = s.replace('import { jsPDF } from "jspdf";\n', 'import { jsPDF } from "jspdf";\nimport { toast } from "sonner";\n', 1)
s = s.replace('  const weeklySummary = trpc.profile.weeklySummary.useQuery(undefined, { enabled: isAuthenticated, retry: false });\n', '  const weeklySummary = trpc.profile.weeklySummary.useQuery(undefined, { enabled: isAuthenticated, retry: false });\n  const weeklyComparison = trpc.profile.weeklyComparison.useQuery(undefined, { enabled: isAuthenticated, retry: false });\n', 1)
s = s.replace('    pdf.save(`global-ai-coach-weekly-summary-${new Date(summary.weekStart).toISOString().slice(0, 10)}.pdf`);\n', '    pdf.save(`global-ai-coach-weekly-summary-${new Date(summary.weekStart).toISOString().slice(0, 10)}.pdf`);\n    toast.success("Weekly summary PDF downloaded");\n', 1)
s = s.replace('      await share.share({ title: "My weekly coaching progress", text, url: window.location.href });\n', '      await share.share({ title: "My weekly coaching progress", text, url: window.location.href });\n      toast.success("Weekly summary shared");\n', 1)
s = s.replace('      window.location.href = `mailto:?subject=${encodeURIComponent("My Global AI Coach progress")}&body=${encodeURIComponent(`${text}\n\nOpen Global AI Coach: ${window.location.href}`)}`;\n', '      window.location.href = `mailto:?subject=${encodeURIComponent("My Global AI Coach progress")}&body=${encodeURIComponent(`${text}\n\nOpen Global AI Coach: ${window.location.href}`)}`;\n      toast.success("Email composer opened");\n', 1)
old = '<p className="mt-2 text-xs text-slate-500">{weeklySummary.data.attempts} attempts · {weeklySummary.data.minutesPracticed} minutes · {weeklySummary.data.averageScore}/10 · {weeklySummary.data.retentionRate ?? 0}% retention</p></> :'
new = '<p className="mt-2 text-xs text-slate-500">{weeklySummary.data.attempts} attempts · {weeklySummary.data.minutesPracticed} minutes · {weeklySummary.data.averageScore}/10 · {weeklySummary.data.retentionRate ?? 0}% retention</p><div className="mt-4 rounded-2xl border border-lime-200 bg-white/70 p-4"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">AI-recommended coaching modules</p><div className="mt-3 grid gap-3 md:grid-cols-3">{parseRecommendedModules(weeklySummary.data.recommendedModules).map((module) => <div key={module.title} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{module.title}</p><Badge variant="secondary">{module.score}/10</Badge></div><p className="mt-1 text-xs leading-5 text-slate-600">{module.reason}</p><p className="mt-2 text-xs font-medium text-emerald-700">Next: {module.action}</p></div>)}</div></div></> :'
if old not in s: raise SystemExit('summary metrics anchor not found')
s = s.replace(old, new, 1)
old = '</div>{generateWeeklySummary.isPending && <div className="mt-5" aria-live="polite">'
new = '</div>{weeklySummary.data && weeklyComparison.data && <div className="mt-5 grid gap-3 rounded-2xl border border-lime-200 bg-white/60 p-4 text-sm md:grid-cols-3"><div><p className="text-xs uppercase tracking-widest text-slate-500">Previous weeks</p><p className="mt-1 font-semibold text-slate-900">{weeklyComparison.previousWeeks.length ? `${weeklyComparison.previousWeeks[0]?.averageScore}/10 latest` : "No baseline yet"}</p><p className="text-xs text-slate-500">{weeklyComparison.previousWeeks.length} saved comparison weeks</p></div><div><p className="text-xs uppercase tracking-widest text-slate-500">Peer average</p><p className="mt-1 font-semibold text-slate-900">{weeklyComparison.peerAverageScore || "—"}/10</p><p className="text-xs text-slate-500">Aggregated, not individually identified</p></div><div><p className="text-xs uppercase tracking-widest text-slate-500">Time benchmark</p><p className="mt-1 font-semibold text-slate-900">{weeklyComparison.peerAverageMinutes || "—"} min</p><p className="text-xs text-slate-500">Compared with anonymized summaries</p></div></div>}{generateWeeklySummary.isPending && <div className="mt-5" aria-live="polite">'
if old not in s: raise SystemExit('progress anchor not found')
s = s.replace(old, new, 1)
needle = 'type JsonQuestion = { question?: string;'
helper = '''type RecommendedModule = { title: string; reason: string; action: string; skill: string; score: number };
function parseRecommendedModules(value?: string | null): RecommendedModule[] {
  if (!value) return [];
  try { return JSON.parse(value) as RecommendedModule[]; } catch { return []; }
}

'''
if needle not in s: raise SystemExit('type anchor not found')
s = s.replace(needle, helper + needle, 1)
p.write_text(s)
