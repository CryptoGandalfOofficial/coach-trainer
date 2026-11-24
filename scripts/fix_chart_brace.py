from pathlib import Path
p = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx')
s = p.read_text()
needle = '</p></div></div></div><SkillTrendChart series={weeklyComparison.data.trendSeries} /></div>}{generateWeeklySummary.isPending'
replacement = '</p></div></div><SkillTrendChart series={weeklyComparison.data.trendSeries} /></div>}{generateWeeklySummary.isPending'
if needle not in s: raise SystemExit('chart closing anchor not found')
p.write_text(s.replace(needle, replacement, 1))
