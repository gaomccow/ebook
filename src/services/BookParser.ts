/**
 * BookParser.ts
 *
 * Core parsing engine built on native string manipulation and English regex.
 * Applies strict YAGNI principles. No external parsing libraries.
 */

export interface ChapterNode {
  id: string;          // e.g., 'node_intro', 'node_1', 'node_2'
  title: string;       // The extracted chapter header string
  content: string[];   // Array of paragraph strings belonging to this node
  xpValue: number;     // Calculated as: Base 10 XP + 1 XP per 15 words read in content
  status: 'locked' | 'available' | 'completed'; // Default 'available' for first node, 'locked' for others
  pathIndex: number;   // Linear sequence marker (1, 2, 3...) for the Duolingo UI map
}

/**
 * Parses raw book text into structured ChapterNodes.
 */
export function parseBookText(rawText: string): ChapterNode[] {
  const lines = rawText.split(/\r?\n/);
  
  // Regex Patterns
  const standardHeaderRegex = /^(?:chapter|section|part)\s+(?:[0-9]+|[ivxldcm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i;
  const numericSubheadingRegex = /^\d+(?:\.\d+)*\s+[A-Za-z]/;
  const editorialBoundaryRegex = /^(?:prologue|epilogue|preface|appendix)\b/i;

  const nodes: ChapterNode[] = [];
  
  // Track introductory text before any header is found
  let introParagraphs: string[] = [];
  let currentHeader: string | null = null;
  let currentParagraphs: string[] = [];
  let hasFoundFirstHeader = false;

  const countWords = (textArray: string[]): number => {
    return textArray.join(' ').trim().split(/\s+/).filter(Boolean).length;
  };

  const isHeader = (line: string): boolean => {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.length > 100) return false;
    return (
      standardHeaderRegex.test(trimmed) ||
      numericSubheadingRegex.test(trimmed) ||
      editorialBoundaryRegex.test(trimmed)
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isHeader(line)) {
      if (!hasFoundFirstHeader) {
        // Switch over to header parsing mode
        hasFoundFirstHeader = true;
        currentHeader = trimmed;
      } else {
        // We already have a header active. Check if the active node is empty
        // to prevent successive empty headers (TOC filtering/collapsing)
        if (currentParagraphs.length === 0) {
          // Collapse successive empty headers by keeping the latest one
          currentHeader = trimmed;
        } else {
          // Save the previous chapter node
          nodes.push({
            id: `node_placeholder`,
            title: currentHeader || 'Untitled Chapter',
            content: [...currentParagraphs],
            xpValue: 0, // Computed later
            status: 'locked',
            pathIndex: 0 // Computed later
          });
          currentHeader = trimmed;
          currentParagraphs = [];
        }
      }
    } else {
      if (trimmed.length > 0) {
        if (!hasFoundFirstHeader) {
          introParagraphs.push(trimmed);
        } else {
          currentParagraphs.push(trimmed);
        }
      }
    }
  }

  // Push the final active chapter
  if (hasFoundFirstHeader && currentHeader) {
    // If the final chapter has no content, only push it if we have nothing else,
    // or if it actually has content.
    if (currentParagraphs.length > 0 || nodes.length === 0) {
      nodes.push({
        id: `node_placeholder`,
        title: currentHeader,
        content: currentParagraphs,
        xpValue: 0,
        status: 'locked',
        pathIndex: 0
      });
    }
  }

  // Build the final array of ChapterNodes, prepending the node_intro if present
  const finalNodes: ChapterNode[] = [];
  let pathIndex = 1;

  if (introParagraphs.length > 0) {
    const wordCount = countWords(introParagraphs);
    finalNodes.push({
      id: 'node_intro',
      title: 'Introduction',
      content: introParagraphs,
      xpValue: 10 + Math.floor(wordCount / 15),
      status: 'available',
      pathIndex: pathIndex++
    });
  }

  // Process the structured chapters
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const wordCount = countWords(node.content);
    
    // Determine status: The very first node (either node_intro or the first chapter)
    // should be 'available', all others are 'locked' by default.
    const isFirstNode = finalNodes.length === 0;
    
    finalNodes.push({
      id: `node_${i + 1}`,
      title: node.title,
      content: node.content,
      xpValue: 10 + Math.floor(wordCount / 15),
      status: isFirstNode ? 'available' : 'locked',
      pathIndex: pathIndex++
    });
  }

  return finalNodes;
}

// ==========================================
// SAMPLE INPUT SIMULATION DATA & TESTING
// ==========================================

const sampleBookText = `
READABLE.APP PUBLISHING HOUSE
All rights reserved © 2026

TABLE OF CONTENTS
1. Preface
2. Prologue
3. Chapter One

PREFACE
This is some introductory text that belongs to the preface of the book.
It explains the overall scope, design, and objectives.

PROLOGUE
Before the main story begins, this prologue sets up the mood and historical context.

CHAPTER ONE
This is the beginning of the first chapter. We talk about deep reading.
Deep reading is a beautiful practice that builds attention span.

1.1 Numeric Subheading Section
Some numeric subheadings also contain paragraph text like this.

CHAPTER TWO
`;

console.log("Starting simulation run...");
const parsedNodes = parseBookText(sampleBookText);
console.log("JSON schema validation output:\n");
console.log(JSON.stringify(parsedNodes, null, 2));
