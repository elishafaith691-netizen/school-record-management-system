"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { ListSearch } from "@/components/ListSearch";

type GradeRow = {
  id: string;
  score: number;
  letter_grade: string | null;
  term: string;
  created_at: string;
  student_name?: string;
  course_code: string;
  course_title: string;
};

type EnrollmentRow = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  course_code: string;
  course_title: string;
};

type EnrolledStudent = {
  id: string;
  name: string;
  email: string;
  enrollmentCount: number;
  courses: string[];
};

function getEnrolledStudents(enrollments: EnrollmentRow[]) {
  const byStudent = new Map<string, EnrolledStudent>();

  for (const enrollment of enrollments) {
    const student = byStudent.get(enrollment.student_id) ?? {
      id: enrollment.student_id,
      name: enrollment.student_name,
      email: enrollment.student_email,
      enrollmentCount: 0,
      courses: [],
    };

    const course = `${enrollment.course_code} - ${enrollment.course_title}`;
    student.enrollmentCount += 1;
    if (!student.courses.includes(course)) {
      student.courses.push(course);
    }
    byStudent.set(enrollment.student_id, student);
  }

  return [...byStudent.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function GradeHistoryPage() {
  const [grades, setGrades] = useState<GradeRow[] | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[] | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [gradeSearch, setGradeSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadGrades(studentId?: string) {
    setError(null);
    setGrades(null);

    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    const res = await fetch(`/api/grades${query}`);
    const data = (await res.json()) as { grades?: GradeRow[]; error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to load grades");
      setGrades([]);
      return;
    }

    setGrades(data.grades ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const enrollmentRes = await fetch("/api/enrollments");
      const enrollmentData = (await enrollmentRes.json()) as {
        enrollments?: EnrollmentRow[];
        error?: string;
      };

      if (cancelled) return;

      if (enrollmentRes.ok) {
        setEnrolledStudents(getEnrolledStudents(enrollmentData.enrollments ?? []));
        setGrades([]);
        return;
      }

      if (enrollmentRes.status !== 403) {
        setError(enrollmentData.error ?? "Failed to load enrolled students");
        return;
      }

      await loadGrades();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function openStudentGrades(student: EnrolledStudent) {
    setSelectedStudent(student);
    void loadGrades(student.id);
  }

  function closeStudentGrades() {
    setSelectedStudent(null);
    setError(null);
    setGrades([]);
  }

  const filteredEnrolledStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!enrolledStudents || !q) return enrolledStudents ?? [];
    return enrolledStudents.filter((student) =>
      [
        student.name,
        student.email,
        String(student.enrollmentCount),
        student.courses.join(" "),
      ].some((value) => value.toLowerCase().includes(q)),
    );
  }, [enrolledStudents, studentSearch]);

  const filteredGrades = useMemo(() => {
    const q = gradeSearch.trim().toLowerCase();
    if (!grades || !q) return grades ?? [];
    return grades.filter((grade) =>
      [
        grade.course_code,
        grade.course_title,
        grade.student_name ?? "",
        String(grade.score),
        grade.letter_grade ?? "",
        grade.term,
        grade.created_at,
      ].some((value) => value.toLowerCase().includes(q)),
    );
  }, [grades, gradeSearch]);

  if (error && !grades && !enrolledStudents) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!grades && !enrolledStudents) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (enrolledStudents && !selectedStudent) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Grade history</h1>
        <p className="mt-2 text-sm text-slate-600">
          Select an enrolled student to check their grade history.
        </p>
        <ListSearch
          id="enrolled-student-search"
          value={studentSearch}
          onChange={setStudentSearch}
          placeholder="Search by student, email, or course"
        />

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Enrollments</th>
                <th className="px-3 py-2">Courses</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrolledStudents.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-slate-600" colSpan={5}>
                    {studentSearch.trim()
                      ? "No enrolled students match your search."
                      : "No enrolled students yet."}
                  </td>
                </tr>
              ) : (
                filteredEnrolledStudents.map((student) => (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{student.name}</td>
                    <td className="px-3 py-2 text-slate-600">{student.email}</td>
                    <td className="px-3 py-2">{student.enrollmentCount}</td>
                    <td className="max-w-md px-3 py-2 text-slate-600">
                      {student.courses.join(", ")}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                        onClick={() => openStudentGrades(student)}
                      >
                        View grades
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <BackButton />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Grade history</h1>
          {selectedStudent ? (
            <p className="mt-2 text-sm text-slate-600">
              {selectedStudent.name} - {selectedStudent.email}
            </p>
          ) : null}
        </div>
        {selectedStudent ? (
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={closeStudentGrades}
          >
            Student list
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {!grades ? (
        <p className="mt-6 text-slate-600">Loading...</p>
      ) : (
        <>
          <ListSearch
            id="grade-search"
            value={gradeSearch}
            onChange={setGradeSearch}
            placeholder="Search by course, student, score, letter, or term"
          />
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Letter</th>
                  <th className="px-3 py-2">Term</th>
                  <th className="px-3 py-2">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrades.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-600" colSpan={6}>
                      {gradeSearch.trim()
                        ? "No grades match your search."
                        : "No grades yet."}
                    </td>
                  </tr>
                ) : (
                  filteredGrades.map((grade) => (
                    <tr key={grade.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        {grade.course_code} - {grade.course_title}
                      </td>
                      <td className="px-3 py-2">{grade.student_name ?? "-"}</td>
                      <td className="px-3 py-2">{grade.score}</td>
                      <td className="px-3 py-2">{grade.letter_grade ?? "-"}</td>
                      <td className="px-3 py-2">{grade.term || "-"}</td>
                      <td className="px-3 py-2 text-slate-600">{grade.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
