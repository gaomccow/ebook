import re

with open('src/components/ReaderView.tsx', 'r') as f:
    content = f.read()

# 1. Add missing properties to ReaderViewProps
props_target = """  // Word Bank extensions
  onAddWord?: (word: string, definition: string, translation: string) => void;

  // Useful Info integration
  usefulInfoItems?: UsefulInfoItem[];
  onSaveUsefulInfo?: (item: Omit<UsefulInfoItem, 'id' | 'createdAt'>) => void;
  onDeleteUsefulInfo?: (id: string) => void;
  onOpenLightbox?: (filename: string) => void;
  searchTarget?: number | null;
}"""

props_replacement = """  // Word Bank extensions
  onAddWord?: (word: string, definition: string, translation: string, pronunciation?: string) => void;

  // Useful Info integration
  usefulInfoItems?: UsefulInfoItem[];
  onSaveUsefulInfo?: (item: Omit<UsefulInfoItem, 'id' | 'createdAt'>) => void;
  onDeleteUsefulInfo?: (id: string) => void;
  onOpenLightbox?: (filename: string) => void;
  searchTarget?: number | null;
  
  // Dictionary AI props
  aiProvider?: 'gemini' | 'groq';
  apiKey?: string;
}"""
content = content.replace(props_target, props_replacement)

# 2. Add missing props to signature
sig_target = """  onSaveUsefulInfo,
  onDeleteUsefulInfo,
  onOpenLightbox
}) => {"""

sig_replacement = """  onSaveUsefulInfo,
  onDeleteUsefulInfo,
  onOpenLightbox,
  searchTarget,
  aiProvider = 'groq',
  apiKey = ''
}) => {"""
content = content.replace(sig_target, sig_replacement)

# 3. Add missing state vars
state_target = """  const [savingWord, setSavingWord] = useState('');
  const [savingDef, setSavingDef] = useState('');
  const [savingTrans, setSavingTrans] = useState('');
  const [focusQuality, setFocusQuality] = useState(98);"""

state_replacement = """  const [savingWord, setSavingWord] = useState('');
  const [savingDef, setSavingDef] = useState('');
  const [savingTrans, setSavingTrans] = useState('');
  const [savingPronunciation, setSavingPronunciation] = useState('');
  const [isFetchingDictionary, setIsFetchingDictionary] = useState(false);
  const [focusQuality, setFocusQuality] = useState(98);"""
content = content.replace(state_target, state_replacement)

# 4. Remove DICTIONARY_DEMO
demo_target = """  // Local fallback dictionary for demo
  const DICTIONARY_DEMO: Record<string, { definition: string; translation: string }> = {
    'focus': { definition: 'the state or quality of having or producing clear visual definition / concentration of attention', translation: 'sự tập trung' },
    'study': { definition: 'the devotion of time and attention to acquiring knowledge', translation: 'học tập' },
    'book': { definition: 'a written or printed work consisting of pages glued or sewn together along one side', translation: 'quyển sách' }
  };"""
content = content.replace(demo_target, "")

# 5. Fix contentRef -> containerRef
content = content.replace("!contentRef.current", "!containerRef.current")
content = content.replace("const ref = contentRef.current;", "const ref = containerRef.current;")

with open('src/components/ReaderView.tsx', 'w') as f:
    f.write(content)

print("ReaderView.tsx fixed")
