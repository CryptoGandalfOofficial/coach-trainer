from pathlib import Path

path = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx')
s = path.read_text()
replacements = [
    ('Pick a focused drill below"}</p></CardContent></Card></div>{!question && !feedback && <Card', 'Pick a focused drill below"}</p></CardContent></Card></div>{weeklySummary.data && <Card className="mt-6 border-lime-200 bg-lime-50"><CardContent className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center"><div><p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Bell size={16} className="text-emerald-700" /> Weekly progress summary</p><p className="mt-2 text-sm leading-6 text-slate-600">{weeklySummary.data.summaryText}</p></div><Badge variant="secondary">{weeklySummary.data.minutesPracticed} min · {weeklySummary.data.averageScore}/10</Badge></CardContent></Card>}{!question && !feedback && <Card'),
    ('<span><strong className="text-slate-900">Criteria:</strong> {question.evaluationCriteria?.join(", ")}</span></div><textarea', '<span><strong className="text-slate-900">Criteria:</strong> {question.evaluationCriteria?.join(", ")}</span></div>{(question.rubric || question.jurisdictionNotes) && <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 md:grid-cols-2"><span><strong className="text-slate-900">Role rubric:</strong> {question.rubric}</span><span><strong className="text-slate-900">Jurisdiction context:</strong> {question.jurisdictionNotes}</span></div>}<textarea'),
    ('<CardHeader><CardTitle className="text-xl">Retention cohorts</CardTitle>', '<CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-xl">Retention cohorts</CardTitle>'),
    ('<CardDescription>Weekly active return rate by signup cohort.</CardDescription></CardHeader>', '<CardDescription>Weekly active return rate by signup cohort.</CardDescription></div><AnalyticsExportButton /></div></CardHeader>'),
]
for old, new in replacements:
    if old not in s:
        raise SystemExit(f'anchor not found: {old[:80]}')
    s = s.replace(old, new, 1)
needle = 'function Metric({ label, value }: { label: string; value: string })'
insert = '''function AnalyticsExportButton() {
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

'''
if needle not in s:
    raise SystemExit('metric anchor not found')
s = s.replace(needle, insert + needle, 1)
path.write_text(s)
