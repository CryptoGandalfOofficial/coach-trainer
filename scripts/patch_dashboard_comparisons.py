from pathlib import Path

p = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx')
s = p.read_text()
s = s.replace('  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfile);\n', '  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfile);\n  const [peerFilters, setPeerFilters] = useState({ role: "", country: "", experienceLevel: "" });\n', 1)
s = s.replace('  const weeklyComparison = trpc.profile.weeklyComparison.useQuery(undefined, { enabled: isAuthenticated, retry: false });\n', '  const comparisonInput = useMemo(() => ({ role: peerFilters.role || undefined, country: peerFilters.country || undefined, experienceLevel: peerFilters.experienceLevel || undefined }), [peerFilters]);\n  const weeklyComparison = trpc.profile.weeklyComparison.useQuery(comparisonInput, { enabled: isAuthenticated, retry: false });\n', 1)
anchor = '  function saveProfile() { profileSave.mutate(profileDraft); }\n'
insert = '''  function saveProfile() { profileSave.mutate(profileDraft); }
  function acceptModule(module: RecommendedModule) {
    const interviewType: Goal = module.skill === "behavioral" || module.skill === "system-design" || module.skill === "tech-interview" ? module.skill : (goal || "tech-interview");
    setGoal(interviewType);
    setTimeline("1-week");
    profileSave.mutate({ ...profileDraft, targetRole: profileDraft.targetRole || selectedGoal?.title });
    start.mutate({ interviewType, timeline: "1-week" });
  }
'''
if anchor not in s: raise SystemExit('save profile anchor not found')
s = s.replace(anchor, insert, 1)
s = s.replace('<p className="mt-2 text-xs font-medium text-emerald-700">Next: {module.action}</p></div>)', '<p className="mt-2 text-xs font-medium text-emerald-700">Next: {module.action}</p><Button size="sm" className="mt-3 w-full" onClick={() => acceptModule(module)}>Accept module<ArrowRight size={14} className="ml-2" /></Button></div>)', 1)
start = s.index('{weeklySummary.data && weeklyComparison.data && <div className="mt-5 grid gap-3')
end = s.index('{generateWeeklySummary.isPending &&', start)
comparison = '''{weeklySummary.data && weeklyComparison.data && <div className="mt-5 space-y-4 rounded-2xl border border-lime-200 bg-white/60 p-4 text-sm"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="text-xs uppercase tracking-widest text-slate-500">Compare progress</p><p className="mt-1 font-semibold text-slate-900">Previous weeks and anonymized peer averages</p></div><div className="grid gap-2 sm:grid-cols-3"><input value={peerFilters.role} onChange={(event) => setPeerFilters((current) => ({ ...current, role: event.target.value }))} placeholder="Filter role" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900" /><input value={peerFilters.country} onChange={(event) => setPeerFilters((current) => ({ ...current, country: event.target.value }))} placeholder="Filter country" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900" /><select value={peerFilters.experienceLevel} onChange={(event) => setPeerFilters((current) => ({ ...current, experienceLevel: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"><option value="">All experience</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></div></div><div className="grid gap-3 md:grid-cols-3"><div><p className="text-xs uppercase tracking-widest text-slate-500">Previous weeks</p><p className="mt-1 font-semibold text-slate-900">{weeklyComparison.data.previousWeeks.length ? `${weeklyComparison.data.previousWeeks[0]?.averageScore}/10 latest` : "No baseline yet"}</p><p className="text-xs text-slate-500">{weeklyComparison.data.previousWeeks.length} saved comparison weeks</p></div><div><p className="text-xs uppercase tracking-widest text-slate-500">Peer average</p><p className="mt-1 font-semibold text-slate-900">{weeklyComparison.data.peerAverageScore || "—"}/10</p><p className="text-xs text-slate-500">{weeklyComparison.data.peerCount} matching summaries</p></div><div><p className="text-xs uppercase tracking-widest text-slate-500">Time benchmark</p><p className="mt-1 font-semibold text-slate-900">{weeklyComparison.data.peerAverageMinutes || "—"} min</p><p className="text-xs text-slate-500">Filtered anonymized average</p></div></div></div>}'''
s = s[:start] + comparison + s[end:]
p.write_text(s)
