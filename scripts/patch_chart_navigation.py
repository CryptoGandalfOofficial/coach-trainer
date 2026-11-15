from pathlib import Path
p = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx')
s = p.read_text()

s = s.replace('  const saveDateRange = trpc.profile.saveDateRange.useMutation({ onSuccess: () => { void savedDateRanges.refetch(); toast.success("Date range saved"); setRangeName(""); } });\n', '  const saveDateRange = trpc.profile.saveDateRange.useMutation({ onSuccess: () => { void savedDateRanges.refetch(); toast.success("Date range saved"); setRangeName(""); setEditingRangeName(""); } });\n  const updateSavedDateRange = trpc.profile.updateDateRange.useMutation({ onSuccess: () => { void savedDateRanges.refetch(); toast.success("Date range updated"); setRangeName(""); setEditingRangeName(""); } });\n  const deleteSavedDateRange = trpc.profile.deleteDateRange.useMutation({ onSuccess: () => { void savedDateRanges.refetch(); toast.success("Date range deleted"); } });\n', 1)
s = s.replace('  const [rangeName, setRangeName] = useState("");\n', '  const [rangeName, setRangeName] = useState("");\n  const [editingRangeName, setEditingRangeName] = useState("");\n', 1)
s = s.replace('    saveDateRange.mutate({ name: rangeName.trim(), startDate: customStartDate, endDate: customEndDate });', '    const input = { name: rangeName.trim(), startDate: customStartDate, endDate: customEndDate };\n    if (editingRangeName) updateSavedDateRange.mutate({ originalName: editingRangeName, ...input });\n    else saveDateRange.mutate(input);', 1)
s = s.replace('    setRangeName(saved.name);\n  }', '    setRangeName(saved.name);\n    setEditingRangeName(saved.name);\n  }', 1)
anchor = '  function exportComparisonCsv() {'
insert = '''  function editSavedRange(name: string) {
    const saved = savedDateRanges.data?.find((range) => range.name === name);
    if (saved) applySavedRange(saved.name);
  }
  function removeSavedRange(name: string) {
    deleteSavedDateRange.mutate({ name });
    if (editingRangeName === name) { setEditingRangeName(""); setRangeName(""); }
  }
'''
if anchor not in s: raise SystemExit('export anchor missing')
s = s.replace(anchor, insert + anchor, 1)

start = s.index('function SkillTrendChart(')
end = s.index('\nfunction parseSkillTrends', start)
component = '''function SkillTrendChart({ series, range, peerAverages }: { series: Array<{ weekStart: Date; skillTrends: string | null }>; range: number; peerAverages: Array<{ skill: string; score: number; attempts: number }> }) {
  const [zoom, setZoom] = useState(1);
  const [hovered, setHovered] = useState<{ skill: string; week: string; score: number; attempts: number; delta: number | null } | null>(null);
  const windowSize = Math.max(2, Math.ceil(range / zoom));
  const grouped = new Map<string, Array<{ week: string; score: number; attempts: number; delta: number | null }>>();
  for (const point of series.slice(0, windowSize).reverse()) {
    const trends = point.skillTrends ? parseSkillTrends(point.skillTrends) : [];
    for (const trend of trends) {
      const values = grouped.get(trend.skill) || [];
      const previous = values[values.length - 1];
      values.push({ week: new Date(point.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" }), score: trend.score, attempts: trend.attempts, delta: previous ? trend.score - previous.score : null });
      grouped.set(trend.skill, values);
    }
  }
  const skills = Array.from(grouped.entries()).slice(0, 4);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Skill progress over time</p><p className="mt-1 text-sm text-slate-600">Hover or use arrow keys · dashed line is the skill-specific peer average</p></div><div className="flex items-center gap-1"><Button variant="outline" size="sm" onClick={() => setZoom((value) => Math.max(1, value - 1))} aria-label="Zoom out trend chart">−</Button><span className="min-w-16 text-center text-xs text-slate-500">{zoom}× zoom</span><Button variant="outline" size="sm" onClick={() => setZoom((value) => Math.min(4, value + 1))} aria-label="Zoom in trend chart">+</Button><TrendingUp size={18} className="ml-2 text-emerald-700" /></div></div>{skills.length ? <div className="mt-4 space-y-5">{skills.map(([skill, values]) => { const peer = peerAverages.find((item) => item.skill === skill)?.score || 0; return <div key={skill}><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-800">{skill}</span><span className="text-slate-500">{values[values.length - 1]?.score}/10 latest · peer {peer || "—"}</span></div><div className="relative"><div className="flex items-end gap-2">{values.map((value, index) => <div key={`${skill}-${value.week}`} className="relative flex-1 outline-none" tabIndex={0} onMouseEnter={() => setHovered({ skill, ...value })} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered({ skill, ...value })} onBlur={() => setHovered(null)} onKeyDown={(event) => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; event.preventDefault(); const next = Math.max(0, Math.min(values.length - 1, index + (event.key === "ArrowRight" ? 1 : -1))); setHovered({ skill, ...values[next] }); (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus(); }}><div className="h-16 rounded-t-lg bg-slate-100 p-1"><div className="h-full rounded-md bg-emerald-500 transition-all" style={{ height: `${Math.max(8, value.score * 10)}%` }} /></div><p className="mt-1 truncate text-[10px] text-slate-500">{value.week}</p>{hovered?.skill === skill && hovered.week === value.week && <div className="absolute bottom-full left-1/2 z-20 mb-2 w-36 -translate-x-1/2 rounded-lg bg-slate-950 p-2 text-[11px] text-white shadow-lg"><p className="font-semibold">{value.week}</p><p>Score: {value.score}/10</p><p>Attempts: {value.attempts}</p><p className={value.delta === null ? "text-slate-300" : value.delta >= 0 ? "text-lime-300" : "text-rose-300"}>{value.delta === null ? "First saved point" : `${value.delta >= 0 ? "+" : ""}${value.delta} vs prior`}</p></div>}</div>)}</div>{peer > 0 && <div className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-cyan-600" style={{ bottom: `${peer * 10}%` }}><span className="absolute -top-4 right-0 rounded bg-cyan-50 px-1 text-[10px] font-medium text-cyan-700">Peer {peer}/10</span></div>}</div></div>; })}</div> : <p className="mt-4 text-sm text-slate-500">Generate a weekly summary after practicing to populate your trend chart.</p>}</div>;
}'''
s = s[:start] + component + s[end:]
old = '<select value="" onChange={(event) => applySavedRange(event.target.value)} aria-label="Saved date ranges" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"><option value="">Saved ranges…</option>{savedDateRanges.data.map((range) => <option key={range.name} value={range.name}>{range.name}</option>)}</select>'
new = '<div className="flex flex-wrap items-center gap-1"><select value="" onChange={(event) => applySavedRange(event.target.value)} aria-label="Saved date ranges" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"><option value="">Saved ranges…</option>{savedDateRanges.data.map((range) => <option key={range.name} value={range.name}>{range.name}</option>)}</select>{savedDateRanges.data.map((range) => <span key={`actions-${range.name}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1"><Button variant="ghost" size="sm" className="h-7 px-1.5 text-[10px]" onClick={() => editSavedRange(range.name)} aria-label={`Edit ${range.name}`}>Edit</Button><Button variant="ghost" size="sm" className="h-7 px-1.5 text-[10px] text-rose-600" onClick={() => removeSavedRange(range.name)} aria-label={`Delete ${range.name}`}>Delete</Button></span>)}</div>'
if old not in s: raise SystemExit('saved select anchor missing')
s = s.replace(old, new, 1)
s = s.replace('onClick={saveNamedRange} disabled={saveDateRange.isPending}>Save range</Button>', 'onClick={saveNamedRange} disabled={saveDateRange.isPending || updateSavedDateRange.isPending}>{editingRangeName ? "Update range" : "Save range"}</Button>', 1)
s = s.replace('peerAverage={weeklyComparison.data.peerAverageScore}', 'peerAverages={weeklyComparison.data.peerAverageBySkill}', 1)
p.write_text(s)
