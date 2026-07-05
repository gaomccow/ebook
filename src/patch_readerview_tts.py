import re

file_path = '/Users/gaothecow/ebook/src/components/ReaderView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add the pollGeneration ref
if "const pollGeneration = useRef(0);" not in content:
    content = content.replace(
        "const [synthesisState, setSynthesisState] = useState<'idle' | 'generating' | 'playing' | 'error'>('idle');",
        "const [synthesisState, setSynthesisState] = useState<'idle' | 'generating' | 'playing' | 'error'>('idle');\n  const pollGeneration = useRef(0);\n  useEffect(() => () => { pollGeneration.current++; }, []);"
    )

# 2. Add myGen to startCelebritySynthesis
if "const myGen = ++pollGeneration.current;" not in content:
    content = re.sub(
        r"const startCelebritySynthesis = async \(\) => \{",
        "const startCelebritySynthesis = async () => {\n    const myGen = ++pollGeneration.current;",
        content
    )

# 3. Add cancellation check to checkJobStatus
if "if (myGen !== pollGeneration.current) return;" not in content:
    content = re.sub(
        r"const checkJobStatus = async \(\) => \{",
        "const checkJobStatus = async () => {\n        if (myGen !== pollGeneration.current) return;",
        content
    )

# 4. Also invalidate when closing the modal
content = content.replace("setShowCelebModal(false);", "setShowCelebModal(false);\n    pollGeneration.current++;")

with open(file_path, 'w') as f:
    f.write(content)
