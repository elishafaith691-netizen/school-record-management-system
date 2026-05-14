/**
 * Canonical five degree programs with exactly four core subjects each.
 * Used for automatic DB bootstrap and full seed generation.
 */
export type CatalogSubject = { code: string; title: string };

export type CatalogProgram = {
  code: string;
  name: string;
  description: string;
  subjects: readonly CatalogSubject[];
};

export const ACADEMIC_PROGRAM_CATALOG: readonly CatalogProgram[] = [
  {
    code: "BSIT",
    name: "Bachelor of Science in Information Technology",
    description: "Computing, programming, data structures, and databases.",
    subjects: [
      { code: "BSIT-101", title: "Introduction to Computing" },
      { code: "BSIT-102", title: "Computer Programming 1" },
      { code: "BSIT-201", title: "Data Structures and Algorithms" },
      { code: "BSIT-301", title: "Database Management Systems" },
    ],
  },
  {
    code: "BSES",
    name: "Bachelor of Science in Environmental Science",
    description: "Biology, ecology, environmental chemistry, and climate.",
    subjects: [
      { code: "BSES-101", title: "General Biology" },
      { code: "BSES-102", title: "Ecology" },
      { code: "BSES-201", title: "Environmental Chemistry" },
      { code: "BSES-202", title: "Climate Change Studies" },
    ],
  },
  {
    code: "BSED",
    name: "Bachelor of Secondary Education",
    description: "Foundations of teaching and inclusive education.",
    subjects: [
      { code: "BSED-101", title: "Foundations of Education" },
      { code: "BSED-102", title: "Educational Psychology" },
      { code: "BSED-201", title: "Principles of Teaching" },
      { code: "BSED-202", title: "Inclusive Education" },
    ],
  },
  {
    code: "BSAB",
    name: "Bachelor of Science in Agribusiness",
    description: "Agribusiness, economics, entrepreneurship, and strategy.",
    subjects: [
      { code: "BSAB-101", title: "Introduction to Agribusiness" },
      { code: "BSAB-102", title: "Agricultural Economics" },
      { code: "BSAB-201", title: "Entrepreneurship" },
      { code: "BSAB-202", title: "Strategic Management" },
    ],
  },
  {
    code: "BSA",
    name: "Bachelor of Science in Accountancy",
    description: "Financial accounting, cost accounting, auditing, and analysis.",
    subjects: [
      { code: "BSA-101", title: "Financial Accounting and Reporting 1" },
      { code: "BSA-102", title: "Cost Accounting and Control" },
      { code: "BSA-201", title: "Auditing and Assurance Principles" },
      { code: "BSA-202", title: "Strategic Business Analysis" },
    ],
  },
] as const;

export const MAX_SUBJECTS_PER_PROGRAM = 4;
