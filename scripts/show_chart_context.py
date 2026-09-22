from pathlib import Path
s = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx').read_text()
i = s.index('Filtered anonymized average')
print(s[i-500:i+500])
