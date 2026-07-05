import re
import glob

for filepath in glob.glob("/Users/gaothecow/ebook/src/**/*.tsx", recursive=True):
    with open(filepath, "r") as f:
        content = f.read()

    # Find <img ... src={authPicture} ... >
    # This is a bit tricky with regex, let's just do a string replace for the known lines.
    content = content.replace('src={authPicture}', 'src={authPicture}\n                    referrerPolicy="no-referrer"')
    
    with open(filepath, "w") as f:
        f.write(content)
