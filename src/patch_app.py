import re

file_path = '/Users/gaothecow/ebook/src/App.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Fix useEffect missing deps on line 348
old_effect = """  useEffect(() => {
    const email = localStorage.getItem('readable_auth_email');
    if (email) {
      const uid = auth.currentUser?.uid; if (uid) progressionManager.syncFromFirebase(uid, syncState);
    }
  }, []);"""

new_effect = """  useEffect(() => {
    const email = localStorage.getItem('readable_auth_email');
    if (email) {
      const uid = auth.currentUser?.uid; if (uid) progressionManager.syncFromFirebase(uid, syncState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);"""

content = content.replace(old_effect, new_effect)

with open(file_path, 'w') as f:
    f.write(content)
