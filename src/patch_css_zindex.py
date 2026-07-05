import os
import glob
import re

for filepath in glob.glob("/Users/gaothecow/ebook/src/**/*.tsx", recursive=True):
    with open(filepath, 'r') as f:
        content = f.read()

    # Z-index standardization
    content = content.replace("z-[9999]", "z-50")
    content = content.replace("z-55", "z-50")
    content = content.replace("z-[999]", "z-50")

    # Typography fix for tiny text
    content = re.sub(r'text-\[9px\](.*?)leading-none', r'text-[9px]\1leading-normal', content)
    content = re.sub(r'text-xs(.*?)leading-none', r'text-xs\1leading-normal', content)

    # Some hardcoded strings replacements (if possible)
    content = content.replace("'Your Progression Stats'", "t('xpStats')")
    content = content.replace('"XP Level"', "t('level')")
    content = content.replace("'Streak'", "t('streak')")
    content = content.replace("'Level Progress'", "t('levelProgress')")

    with open(filepath, 'w') as f:
        f.write(content)
