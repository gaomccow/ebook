import re

file_path = '/Users/gaothecow/ebook/src/services/ProgressionManager.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Replace the saveState auth logic
content = re.sub(
    r"const email = localStorage\.getItem\('readable_auth_email'\);\n\s*if \(email\) \{\n\s*hashEmail\(email\)\.then\(hashedEmail => \{ const userDocRef = doc\(db, 'users', hashedEmail\); setDoc\(userDocRef, this\.state\)\.catch\(\(err\) => \{ console\.error\('Failed to save state to Firestore:', err\); \}\); \}\)\.catch\(\(err\) => \{\n?",
    "import { auth } from './firebase';\n\n      const uid = auth.currentUser?.uid;\n      if (uid) {\n        const userDocRef = doc(db, 'users', uid);\n        setDoc(userDocRef, this.state).catch((err) => { console.error('Failed to save state to Firestore:', err); });\n",
    content
)

# And fix any broken braces from previous regex
content = re.sub(r"\}\); \}\)\.catch\(\(err\) => \{\n", "", content) # clean up if any
content = content.replace("}); }).catch((err) => {", "")

# We also need to add `auth` to the imports if not there. Wait, I added it locally above in the replacement string, but it should be at the top of the file.
# Let's fix the imports properly.
content = content.replace("import { db } from './firebase';", "import { db, auth } from './firebase';")
# Remove the inline import I just added
content = content.replace("import { auth } from './firebase';\n\n      const uid = auth.currentUser?.uid;", "const uid = auth.currentUser?.uid;")

# Fix syncFromFirebase
content = re.sub(
    r"public async syncFromFirebase\(email: string, onUpdate: \(\) => void\): Promise<void> \{",
    "public async syncFromFirebase(uid: string, onUpdate: () => void): Promise<void> {",
    content
)

content = re.sub(
    r"const hashedEmail = await hashEmail\(email\);\n\s*const userDocRef = doc\(db, 'users', hashedEmail\);",
    "const userDocRef = doc(db, 'users', uid);",
    content
)

# Also update App.tsx to pass `uid` instead of `email` to `syncFromFirebase` if needed
with open(file_path, 'w') as f:
    f.write(content)
