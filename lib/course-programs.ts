export const COURSE_PROGRAMS = ["BSIT", "BSED", "BSAB", "BSA", "BSES"] as const;

export type CourseProgram = (typeof COURSE_PROGRAMS)[number];

export function isCourseProgram(value: string): value is CourseProgram {
  return (COURSE_PROGRAMS as readonly string[]).includes(value);
}
