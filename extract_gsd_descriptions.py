import os
import re

base_path = r"C:\Users\cliente\.gemini\antigravity\skills"
gsd_skills = [d for d in os.listdir(base_path) if d.startswith("gsd-") and os.path.isdir(os.path.join(base_path, d))]

descriptions = {}

for skill in gsd_skills:
    skill_file = os.path.join(base_path, skill, "SKILL.md")
    if os.path.exists(skill_file):
        with open(skill_file, "r", encoding="utf-8") as f:
            content = f.read()
            match = re.search(r"description:\s*\"?(.*?)\"?\n", content)
            if match:
                descriptions[skill] = match.group(1)

for skill, desc in descriptions.items():
    print(f"{skill}: {desc}")
