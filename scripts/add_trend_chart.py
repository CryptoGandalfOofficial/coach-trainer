from pathlib import Path
p = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx')
s = p.read_text()
anchor = 'function AnalyticsExportButton() {'
component = '''function SkillTrendChart({ series }: { series: Array<{ weekStart: Date; skillTrends: string | null }> }) {
  const grouped = new Map<string, Array<{ week: string; score: number }>>();
  for (const point of series.slice().reverse()) {
    const trends = point.skillTrends ? parseSkillTrends(point.skillTrends) : [];
    for (const trend of trends) {
      const values = grouped.get(trend.skill) || [];
      values.push({ week: new Date(point.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" }), score: trend.score });
      grouped.set(trend.skill, values);
    }
  }
  const skills = Array.from(grouped.entries()).slice(0, 4);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Skill progress over time</p><p className="mt-1 text-sm text-slate-600">Your latest saved weekly reports</p></div><TrendingUp size={18} className="text-emerald-700" /></div>{skills.length ? <div className="mt-4 space-y-4">{skills.map(([skill, values]) => <div key={skill}><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-800">{skill}</span><span className="text-slate-500">{values[values.length - 1]?.score}/10 latest</span></div><div className="flex items-end gap-2">{values.map((value) => <div key={`${skill}-${value.week}`} className="flex-1"><div className="h-16 rounded-t-lg bg-slate-100 p-1"><div className="h-full rounded-md bg-emerald-500 transition-all" style={{ height: `${Math.max(8, value.score * 10)}%` }} title={`${value.week}: ${value.score}/10`} /></div><p className="mt-1 truncate text-[10px] text-slate-500">{value.week}</p></div>)}</div></div>)}</div> : <p className="mt-4 text-sm text-slate-500">Generate a weekly summary after practicing to populate your trend chart.</p>}</div>;
}

function parseSkillTrends(value: string): Array<{ skill: string; score: number; attempts: number }> {
  try { return JSON.parse(value) as Array<{ skill: string; score: number; attempts: number }>; } catch { return []; }
}

'''
if anchor not in s: raise SystemExit('analytics button anchor not found')
s = s.replace(anchor, component + anchor, 1)
needle = 'Filtered anonymized average</p></div></div></div>}{generateWeeklySummary.isPending &&'
replacement = 'Filtered anonymized average</p></div></div></div><SkillTrendChart series={weeklyComparison.data.trendSeries} /></div>}{generateWeeklySummary.isPending &&'
if needle not in s: raise SystemExit('comparison chart anchor not found')
s = s.replace(needle, replacement, 1)
p.write_text(s)
