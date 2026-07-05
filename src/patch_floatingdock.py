import re

file_path = '/Users/gaothecow/ebook/src/components/ui/FloatingDock.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace getBoundingClientRect in useTransform
new_code = """
  const boundsRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  React.useEffect(() => {
    const updateBounds = () => {
      if (ref.current) {
        boundsRef.current = ref.current.getBoundingClientRect();
      }
    };
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, []);

  // Compute distance from mouse to center of the icon
  const distance = useTransform(mouseVal, (val: number) => {
    const bounds = boundsRef.current;
"""

content = re.sub(
    r"\s*// Compute distance from mouse to center of the icon\n\s*const distance = useTransform\(mouseVal, \(val: number\) => \{\n\s*const bounds = ref\.current\?\.getBoundingClientRect\(\) \?\? \{ x: 0, y: 0, width: 0, height: 0 \};",
    new_code,
    content
)

with open(file_path, 'w') as f:
    f.write(content)
