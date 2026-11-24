from pathlib import Path

p = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx')
s = p.read_text()

s = s.replace('  const [customEndDate, setCustomEndDate] = useState("");\n', '  const [customEndDate, setCustomEndDate] = useState("");\n  const [rangeName, setRangeName] = useState("");\n', 1)
s = s.replace('  const weeklyComparison = trpc.profile.weeklyComparison.useQuery(comparisonInput, { enabled: isAuthenticated, retry: false });\n', '  const weeklyComparison = trpc.profile.weeklyComparison.useQuery(comparisonInput, { enabled: isAuthenticated, retry: false });\n  const savedDateRanges = trpc.profile.savedDateRanges.useQuery(undefined, { enabled: isAuthenticated, retry: false });\n  const saveDateRange = trpc.profile.saveDateRange.useMutation({ onSuccess: () => { void savedDateRanges.refetch(); toast.success("Date range saved"); setRangeName(""); } });\n', 1)
anchor = '  function exportComparisonCsv() {'
insert = '''  function saveNamedRange() {
    if (!rangeName.trim() || !customStartDate || !customEndDate) { toast.error("Add a name, start date, and end date first"); return; }
    if (customStartDate > customEndDate) { toast.error("Start date must be before end date"); return; }
    saveDateRange.mutate({ name: rangeName.trim(), startDate: customStartDate, endDate: customEndDate });
  }
  function applySavedRange(name: string) {
    const saved = savedDateRanges.data?.find((range) => range.name === name);
    if (!saved) return;
    setTrendRange("custom");
    setCustomStartDate(saved.startDate);
    setCustomEndDate(saved.endDate);
    setRangeName(saved.name);
  }
'''
if anchor not in s: raise SystemExit('export comparison anchor not found')
s = s.replace(anchor, insert + anchor, 1)
old_component_start = s.index('function SkillTrendChart(')
old_component_end = s.index('\nfunction parseSkillTrends', old_component_start)
new_component = '''function SkillTrendChart({ series, range, peerAverage }: { series: Array<{ weekStart: Date; skillTrends: string | null }>; range: number; peerAverage: number }) {
  const [hovered, setHovered] = useState<{ skill: string; week: string; score: number; attempts: number; delta: number | null } | null>(null);
  const grouped = new Map<string, Array<{ week: string; score: number; attempts: number; delta: number | null }>>();
  for (const point of series.slice(0, range).reverse()) {
    const trends = point.skillTrends ? parseSkillTrends(point.skillTrends) : [];
    for (const trend of trends) {
      const values = grouped.get(trend.skill) || [];
      const previous = values[values.length - 1];
      values.push({ week: new Date(point.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" }), score: trend.score, attempts: trend.attempts, delta: previous ? trend.score - previous.score : null });
      grouped.set(trend.skill, values);
    }
  }
  const skills = Array.from(grouped.entries()).slice(0, 4);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Skill progress over time</p><p className="mt-1 text-sm text-slate-600">Hover a point for score changes · dashed line is filtered peer average</p></div><TrendingUp size={18} className="text-emerald-700" /></div>{skills.length ? <div className="mt-4 space-y-5">{skills.map(([skill, values]) => <div key={skill}><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-800">{skill}</span><span className="text-slate-500">{values[values.length - 1]?.score}/10 latest</span></div><div className="relative"><div className="flex items-end gap-2">{values.map((value, index) => <div key={`${skill}-${value.week}`} className="relative flex-1" tabIndex={0} onMouseEnter={() => setHovered({ skill, ...value })} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered({ skill, ...value })} onBlur={() => setHovered(null)}><div className="h-16 rounded-t-lg bg-slate-100 p-1"><div className="h-full rounded-md bg-emerald-500 transition-all" style={{ height: `${Math.max(8, value.score * 10)}%` }} /></div><p className="mt-1 truncate text-[10px] text-slate-500">{value.week}</p>{hovered?.skill === skill && hovered.week === value.week && <div className="absolute bottom-full left-1/2 z-20 mb-2 w-36 -translate-x-1/2 rounded-lg bg-slate-950 p-2 text-[11px] text-white shadow-lg"><p className="font-semibold">{value.week}</p><p>Score: {value.score}/10</p><p>Attempts: {value.attempts}</p><p className={value.delta === null ? "text-slate-300" : value.delta >= 0 ? "text-lime-300" : "text-rose-300"}>{value.delta === null ? "First saved point" : `${value.delta >= 0 ? "+" : ""}${value.delta} vs prior`}</p></div>}</div>)}</div>{peerAverage > 0 && <div className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-cyan-600" style={{ bottom: `${peerAverage * 10}%` }}><span className="absolute -top-4 right-0 rounded bg-cyan-50 px-1 text-[10px] font-medium text-cyan-700">Peer {peerAverage}/10</span></div>}</div></div>)}</div> : <p className="mt-4 text-sm text-slate-500">Generate a weekly summary after practicing to populate your trend chart.</p>}</div>;
}'''
s = s[:old_component_start] + new_component + s[old_component_end:]
old_controls = '<span className="text-xs font-medium text-slate-600">Chart range</span><select value={trendRange} onChange={(event) => setTrendRange(event.target.value as "4" | "8" | "custom")} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"><option value="4">Last 4 weeks</option><option value="8">Last 8 weeks</option><option value="custom">Custom dates</option></select>{trendRange === "custom" && <><input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} aria-label="Trend start date" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900" /><input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} aria-label="Trend end date" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900" /></>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={exportComparisonCsv}><Download size={14} className="mr-1" /> CSV</Button><Button variant="outline" size="sm" onClick={() => void exportTrendPng()}><Download size={14} className="mr-1" /> PNG</Button><Button variant="outline" size="sm" onClick={() => void exportTrendPdf()}><Download size={14} className="mr-1" /> PDF</Button></div></div><div ref={chartRef}><SkillTrendChart series={weeklyComparison.data.trendSeries} range={trendRange === "custom" ? 100 : Number(trendRange)} /></div>'
new_controls = '<span className="text-xs font-medium text-slate-600">Chart range</span><select value={trendRange} onChange={(event) => setTrendRange(event.target.value as "4" | "8" | "custom")} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"><option value="4">Last 4 weeks</option><option value="8">Last 8 weeks</option><option value="custom">Custom dates</option></select>{savedDateRanges.data && savedDateRanges.data.length > 0 && <select value="" onChange={(event) => applySavedRange(event.target.value)} aria-label="Saved date ranges" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"><option value="">Saved ranges…</option>{savedDateRanges.data.map((range) => <option key={range.name} value={range.name}>{range.name}</option>)}</select>}{trendRange === "custom" && <div className="flex flex-wrap items-center gap-2"><input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} aria-label="Trend start date" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900" /><input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} aria-label="Trend end date" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900" /><input value={rangeName} onChange={(event) => setRangeName(event.target.value)} placeholder="Name this range" aria-label="Saved range name" className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900" /><Button variant="outline" size="sm" onClick={saveNamedRange} disabled={saveDateRange.isPending}>Save range</Button></div>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={exportComparisonCsv}><Download size={14} className="mr-1" /> CSV</Button><Button variant="outline" size="sm" onClick={() => void exportTrendPng()}><Download size={14} className="mr-1" /> PNG</Button><Button variant="outline" size="sm" onClick={() => void exportTrendPdf()}><Download size={14} className="mr-1" /> PDF</Button></div></div><div ref={chartRef}><SkillTrendChart series={weeklyComparison.data.trendSeries} range={trendRange === "custom" ? 100 : Number(trendRange)} peerAverage={weeklyComparison.data.peerAverageScore} /></div>'
if old_controls not in s: raise SystemExit('chart controls anchor not found')
s = s.replace(old_controls, new_controls, 1)
p.write_text(s)
