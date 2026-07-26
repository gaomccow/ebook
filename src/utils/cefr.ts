export type CEFRLevel = 
  | 'Pre-A1' 
  | 'A1' 
  | 'A1+' 
  | 'A2' 
  | 'A2+' 
  | 'B1' 
  | 'B1+' 
  | 'B2' 
  | 'B2+' 
  | 'C1' 
  | 'C1+' 
  | 'C2' 
  | 'C2+';

export interface CEFRLevelOption {
  code: CEFRLevel;
  label: string;
  desc: string;
  descVi: string;
  color: string; // Tailwind color class for badges
}

export const ALL_CEFR_LEVELS: CEFRLevel[] = [
  'Pre-A1',
  'A1',
  'A1+',
  'A2',
  'A2+',
  'B1',
  'B1+',
  'B2',
  'B2+',
  'C1',
  'C1+',
  'C2',
  'C2+'
];

export const CEFR_LEVEL_OPTIONS: CEFRLevelOption[] = [
  {
    code: 'Pre-A1',
    label: 'Pre-A1',
    desc: 'Starter / Absolute Beginner (Basic vocabulary & picture words)',
    descVi: 'Khởi đầu / Mới bắt đầu (Từ vựng cơ bản & hình ảnh)',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  {
    code: 'A1',
    label: 'A1',
    desc: 'Beginner — Breakthrough (Simple sentences & everyday phrases)',
    descVi: 'Sơ cấp — Khám phá (Câu đơn giản & cụm từ giao tiếp)',
    color: 'bg-green-100 text-green-800 border-green-300'
  },
  {
    code: 'A1+',
    label: 'A1+',
    desc: 'High Beginner (Expanding sentence structures & basic stories)',
    descVi: 'Sơ cấp nâng cao (Mở rộng cấu trúc câu & truyện ngắn)',
    color: 'bg-teal-100 text-teal-800 border-teal-300'
  },
  {
    code: 'A2',
    label: 'A2',
    desc: 'Elementary — Waystage (Familiar routines & descriptive narratives)',
    descVi: 'Cơ bản — Nền tảng (Chủ đề quen thuộc & miêu tả)',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300'
  },
  {
    code: 'A2+',
    label: 'A2+',
    desc: 'High Elementary (Simple non-fiction & connected paragraphs)',
    descVi: 'Cơ bản nâng cao (Sách phi hư cấu đơn giản & đoạn văn liên kết)',
    color: 'bg-sky-100 text-sky-800 border-sky-300'
  },
  {
    code: 'B1',
    label: 'B1',
    desc: 'Intermediate — Threshold (Main points on abstract & concrete topics)',
    descVi: 'Trung cấp — Ngưỡng (Nắm ý chính chủ đề trừu tượng & thực tế)',
    color: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  {
    code: 'B1+',
    label: 'B1+',
    desc: 'High Intermediate (Complex plots & explicit arguments)',
    descVi: 'Trung cấp nâng cao (Cốt truyện phức tạp & lập luận rõ ràng)',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300'
  },
  {
    code: 'B2',
    label: 'B2',
    desc: 'Upper Intermediate — Vantage (Technical discussions & nuanced prose)',
    descVi: 'Trung cao cấp (Thảo luận chuyên môn & văn phong tinh tế)',
    color: 'bg-violet-100 text-violet-800 border-violet-300'
  },
  {
    code: 'B2+',
    label: 'B2+',
    desc: 'High Upper-Intermediate (Dense narrative & implied meanings)',
    descVi: 'Trung cao cấp nâng cao (Truyện thâm thúy & ẩn ý sâu sắc)',
    color: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  {
    code: 'C1',
    label: 'C1',
    desc: 'Advanced — Effective Operational (Demanding literature & academic essays)',
    descVi: 'Cao cấp — Thành thạo (Văn học hàn lâm & luận văn chuyên sâu)',
    color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300'
  },
  {
    code: 'C1+',
    label: 'C1+',
    desc: 'High Advanced (Complex technical treatises & subtle rhetoric)',
    descVi: 'Cao cấp nâng cao (Chuyên luận kỹ thuật & nghệ thuật biện luận)',
    color: 'bg-pink-100 text-pink-800 border-pink-300'
  },
  {
    code: 'C2',
    label: 'C2',
    desc: 'Mastery — Proficient (Native-level fluency & complex classic literature)',
    descVi: 'Thành thục — Điêu luyện (Trình độ như người bản xứ & tác phẩm kinh điển)',
    color: 'bg-rose-100 text-rose-800 border-rose-300'
  },
  {
    code: 'C2+',
    label: 'C2+',
    desc: 'Native / Specialized Academic (Specialized scholarly research & dense prose)',
    descVi: 'Chuyên gia / Hàn lâm chuyên sâu (Nghiên cứu học thuật chuyên ngành)',
    color: 'bg-amber-100 text-amber-800 border-amber-300'
  }
];

export function getCEFROption(level?: string): CEFRLevelOption {
  const found = CEFR_LEVEL_OPTIONS.find(o => o.code === level);
  if (found) return found;
  // Default fallback if unknown
  return CEFR_LEVEL_OPTIONS.find(o => o.code === 'B2') || CEFR_LEVEL_OPTIONS[7];
}
