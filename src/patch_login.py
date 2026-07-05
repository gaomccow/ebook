import re

file_path = '/Users/gaothecow/ebook/src/components/LoginView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Remove GitHubIcon definition
content = re.sub(r'const GitHubIcon = \(\) => \([\s\S]*?\);\n\n', '', content)

# Remove unused vars email, setEmail, handleSubmit
content = re.sub(r"const \[email, setEmail\] = useState\(''\);\n", "", content)
content = re.sub(r"const handleSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?\}\n\n", "", content)

with open(file_path, 'w') as f:
    f.write(content)
