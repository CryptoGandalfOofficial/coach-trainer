from pathlib import Path
p = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx')
s = p.read_text()
for old, new in {
    'weeklyComparison.previousWeeks.length': 'weeklyComparison.data.previousWeeks.length',
    'weeklyComparison.previousWeeks[0]': 'weeklyComparison.data.previousWeeks[0]',
    'weeklyComparison.peerAverageScore': 'weeklyComparison.data.peerAverageScore',
    'weeklyComparison.peerAverageMinutes': 'weeklyComparison.data.peerAverageMinutes',
}.items():
    s = s.replace(old, new)
p.write_text(s)
