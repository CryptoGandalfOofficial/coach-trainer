from pathlib import Path
p = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx')
s = p.read_text()
needle = '</CardContent></Card>}}{!question && !feedback && <Card'
if needle not in s:
    raise SystemExit('duplicated brace anchor not found')
p.write_text(s.replace(needle, '</CardContent></Card>}{!question && !feedback && <Card', 1))
