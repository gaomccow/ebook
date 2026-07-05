import re

file_path = '/Users/gaothecow/ebook/src/App.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Make sure auth is imported
if "import { auth }" not in content:
    content = content.replace("import { auth as firebaseAuth }", "import { auth as firebaseAuth, auth }")
    if "import { auth }" not in content:
        content = content.replace("import { db } from './services/firebase';", "import { db, auth } from './services/firebase';")
        content = content.replace("import { auth } from './services/firebase';", "import { auth, db } from './services/firebase';")

# Replace syncFromFirebase(email
content = re.sub(r"progressionManager\.syncFromFirebase\(email, syncState\);", "const uid = auth.currentUser?.uid; if (uid) progressionManager.syncFromFirebase(uid, syncState);", content)

with open(file_path, 'w') as f:
    f.write(content)
