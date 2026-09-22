from pathlib import Path
lines = Path('/home/ubuntu/global-ai-coach/client/src/pages/Home.tsx').read_text().splitlines()
line = lines[138]
column = 4255
print(line[max(0, column - 400):column + 400])
print(' ' * min(400, column) + '^')
