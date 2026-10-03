"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Edit3, Eye, ImageIcon, Plus, Search, X } from "lucide-react";
import { saveAdminCourse, setAdminCourseStatus, uploadAdminCourseImage } from "@/app/actions/admin-courses";

type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  price: number;
  level: string;
  status: "draft" | "published" | "archived";
  created_at: string;
  image_url: string | null;
  enrollment_count: number;
  skills: string[];
  curriculum?: string[];
  requirements: string[];
};

type CourseForm = {
  title: string;
  description: string;
  category: string;
  duration: string;
  price: string;
  level: string;
  status: "draft" | "published" | "archived";
  skills: string;
  curriculum: string;
  requirements: string;
};

const emptyForm: CourseForm = {
  title: "",
  description: "",
  category: "",
  duration: "",
  price: "0",
  level: "Beginner",
  status: "draft",
  skills: "",
  curriculum: "",
  requirements: "",
};

function statusLabel(status: string) {
  switch (status) {
    case "published": return "Published";
    case "draft": return "Draft";
    case "archived": return "Archived";
    default: return "Unknown";
  }
}

function statusTone(status: string) {
  switch (status) {
    case "published": return "bg-[#e7f1eb] text-[#145b48]";
    case "draft": return "bg-[#f0f1ed] text-[#657474]";
    case "archived": return "bg-[#f8ebdb] text-[#834f21]";
    default: return "bg-[#f0f1ed] text-[#657474]";
  }
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export function AdminCourseManager({ initialCourses, categories, total, page, pageSize, search, status, category, loadError }: {
  initialCourses: Course[];
  categories: string[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  status: string;
  category: string;
  loadError: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CourseForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [busyCourse, setBusyCourse] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function startCreate() {
    clearMessages();
    setEditingId(null);
    setImageFile(null);
    setForm({ ...emptyForm });
  }

  function startEdit(course: Course) {
    clearMessages();
    setEditingId(course.id);
    setImageFile(null);
    setForm({
      title: course.title,
      description: course.description,
      category: course.category,
      duration: course.duration,
      price: String(course.price ?? 0),
      level: course.level || "Beginner",
      status: course.status,
      skills: course.skills.join("\n"),
      curriculum: (course as Course & { curriculum?: string[] }).curriculum?.join("\n") ?? course.skills.join("\n"),
      requirements: course.requirements.join("\n"),
    });
  }

  async function saveCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || saving) return;
    clearMessages();
    setSaving(true);

    try {
      const result = await saveAdminCourse(editingId, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (imageFile) {
        const imageResult = await uploadAdminCourseImage(result.id, (() => {
          const data = new FormData();
          data.set("image", imageFile);
          return data;
        })());
        if (!imageResult.ok) {
          setSuccess("Course saved. Image upload failed: " + imageResult.error);
        } else {
          setSuccess(editingId ? "Course updated." : "Course created.");
        }
      } else {
        setSuccess(editingId ? "Course updated." : "Course created.");
      }

      setForm(null);
      setEditingId(null);
      setImageFile(null);
      router.refresh();
    } catch {
      setError("The course could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !imageFile || imageBusy) return;
    clearMessages();
    setImageBusy(true);

    try {
      const formData = new FormData();
      formData.set("image", imageFile);
      const result = await uploadAdminCourseImage(editingId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Course image updated.");
      setImageFile(null);
      router.refresh();
    } catch {
      setError("The course image could not be uploaded.");
    } finally {
      setImageBusy(false);
    }
  }

  async function toggleStatus(course: Course) {
    const nextStatus: Course["status"] = course.status === "published" ? "draft" : course.status === "draft" ? "published" : "archived";
    const message = nextStatus === "published" ? "publish" : nextStatus === "draft" ? "move back to draft" : "archive";
    const confirmed = window.confirm(`Do you want to ${message} “${course.title}”?`);
    if (!confirmed) return;

    clearMessages();
    setBusyCourse(course.id);

    try {
      const result = await setAdminCourseStatus(course.id, nextStatus);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Course ${nextStatus === "published" ? "published" : nextStatus === "draft" ? "set to draft" : "archived"}.`);
      router.refresh();
    } catch {
      setError("The course status could not be changed.");
    } finally {
      setBusyCourse(null);
    }
  }

  const startRow = total ? page * pageSize + 1 : 0;
  const endRow = Math.min((page + 1) * pageSize, total);
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (nextPage > 0) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/admin/courses?${query}` : "/admin/courses";
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Course management</h1>
          <p className="mt-1 text-sm text-[#657474]">{total.toLocaleString("en-IN")} courses</p>
        </div>
        <button type="button" className="button button-dark min-h-10 self-start sm:self-auto" onClick={() => (form ? setForm(null) : startCreate())}>
          {form ? <X size={15} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {form ? "Cancel" : "Add Course"}
        </button>
      </div>

      {loadError ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{loadError}</div> : null}
      {error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{error}</div> : null}
      {success ? <div role="status" className="mb-5 flex items-center gap-2 border border-[#cfe4d6] bg-[#f2f9f3] p-4 text-sm text-[#145b48]"><Check size={15} aria-hidden="true" />{success}</div> : null}

      <form method="get" className="mb-5 border border-[#e1e7e1] bg-white p-4 sm:p-5" aria-label="Search and filter courses">
        <div className="grid min-w-0 gap-3 lg:grid-cols-[1.2fr_220px_220px_auto]">
          <label className="relative min-w-0"><span className="sr-only">Search courses</span><Search className="pointer-events-none absolute left-3 top-3 text-[#657474]" size={15} aria-hidden="true" /><input name="q" defaultValue={search} maxLength={100} className="min-h-10 w-full rounded border border-[#ccd7ce] pl-9 pr-3 text-sm" placeholder="Title, category, or description" /></label>
          <label className="min-w-0"><span className="sr-only">Status</span><select name="status" defaultValue={status} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All states</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
          <label className="min-w-0"><span className="sr-only">Category</span><select name="category" defaultValue={category} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <div className="flex items-center gap-2"><button type="submit" className="button button-dark min-h-10">Apply</button><Link href="/admin/courses" className="button button-outline min-h-10">Clear</Link></div>
        </div>
      </form>

      {form ? (
        <section className="mb-6 border border-[#dce4dd] bg-white p-4 sm:p-6" aria-labelledby="course-form-title">
          <div className="mb-5 border-b border-[#e5e9e2] pb-4">
            <p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">COURSE DETAILS</p>
            <h2 id="course-form-title" className="mt-1 text-lg font-semibold text-[#152b2b]">{editingId ? "Edit course" : "Add a course"}</h2>
          </div>

          <form onSubmit={saveCourse} className="grid min-w-0 gap-4 lg:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252] lg:col-span-2">Course title<input required maxLength={180} className="min-h-10 w-full rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252] lg:col-span-2">Description<textarea required rows={5} maxLength={12000} className="w-full rounded border border-[#ccd7ce] px-3 py-2 text-sm font-normal text-[#152b2b]" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Category<input required maxLength={120} className="min-h-10 w-full rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Duration<input required maxLength={80} className="min-h-10 w-full rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Price (₹)<input required type="number" min="0" step="0.01" className="min-h-10 w-full rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Level<select className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm font-normal text-[#152b2b]" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option></select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Status<select className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm font-normal text-[#152b2b]" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CourseForm["status"] })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252] lg:col-span-2">Skills (one per line or comma-separated)<textarea rows={3} maxLength={5000} className="w-full rounded border border-[#ccd7ce] px-3 py-2 text-sm font-normal text-[#152b2b]" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252] lg:col-span-2">Curriculum topics (one per line or comma-separated)<textarea rows={4} maxLength={20000} className="w-full rounded border border-[#ccd7ce] px-3 py-2 text-sm font-normal text-[#152b2b]" value={form.curriculum} onChange={(event) => setForm({ ...form, curriculum: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252] lg:col-span-2">Requirements (one per line or comma-separated)<textarea rows={3} maxLength={5000} className="w-full rounded border border-[#ccd7ce] px-3 py-2 text-sm font-normal text-[#152b2b]" value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} /></label>

            <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
              <button type="submit" disabled={saving} className="button button-dark min-h-10 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save changes" : "Create course"}</button>
              <button type="button" className="button button-outline min-h-10" onClick={() => setForm(null)}>Close</button>
            </div>
          </form>

          {editingId ? (
            <form onSubmit={uploadImage} className="mt-5 grid gap-3 rounded border border-dashed border-[#d7e1df] bg-[#f9fbf9] p-3 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#152b2b]"><ImageIcon size={15} aria-hidden="true" />Update course image</div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-[#425252] file:mr-3 file:rounded file:border-0 file:bg-[#e7f1eb] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#145b48] sm:max-w-md" />
              <button type="submit" disabled={!imageFile || imageBusy} className="button button-outline min-h-10 disabled:cursor-not-allowed disabled:opacity-60">{imageBusy ? "Uploading..." : "Upload image"}</button>
            </form>
          ) : null}
        </section>
      ) : null}

      {!loadError && initialCourses.length === 0 ? (
        <div className="border border-dashed border-[#d5ded6] bg-white px-5 py-12 text-center">
          <BookOpen className="mx-auto text-[#176b55]" size={24} aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-[#152b2b]">No courses found</h2>
          <p className="mt-1 text-sm text-[#657474]">Try another search or add a new course.</p>
        </div>
      ) : null}

      {initialCourses.length ? (
        <>
          <div className="hidden overflow-x-auto border border-[#e1e7e1] bg-white lg:block">
            <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
              <thead className="bg-[#f3f6f2] text-[10px] uppercase tracking-[0.08em] text-[#657474]">
                <tr>
                  {['Course', 'Category', 'Price', 'Duration', 'Status', 'Enrollments', 'Created', 'Actions'].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0eb]">
                {initialCourses.map((course) => (
                  <tr key={course.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 overflow-hidden rounded border border-[#dce4dd] bg-[#f4f6f2]">
                          {course.image_url ? <img src={course.image_url} alt={course.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[#176b55]"><ImageIcon size={18} aria-hidden="true" /></div>}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/courses/${course.id}`} className="block truncate font-semibold text-[#176b55] hover:underline">{course.title}</Link>
                          <p className="mt-1 truncate text-[#657474]">{course.description.slice(0, 90) || "No description"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[#425252]">{course.category}</td>
                    <td className="px-3 py-3 tabular-nums text-[#425252]">₹{course.price.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-3 text-[#425252]">{course.duration}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(course.status)}`}>{statusLabel(course.status)}</span></td>
                    <td className="px-3 py-3 tabular-nums text-[#425252]">{course.enrollment_count}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#657474]">{dateLabel(course.created_at)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/courses/${course.id}`} className="inline-flex items-center gap-1 text-[#176b55] hover:underline"><Eye size={14} aria-hidden="true" />View</Link>
                        <button type="button" className="inline-flex items-center gap-1 text-[#176b55] hover:underline" onClick={() => startEdit(course)}><Edit3 size={14} aria-hidden="true" />Edit</button>
                        <button type="button" className="inline-flex items-center gap-1 text-[#176b55] hover:underline" onClick={() => toggleStatus(course)} disabled={busyCourse === course.id}>{busyCourse === course.id ? "Working..." : course.status === "published" ? "Draft" : "Publish"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {initialCourses.map((course) => (
              <article key={course.id} className="border border-[#e1e7e1] bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded border border-[#dce4dd] bg-[#f4f6f2]">
                    {course.image_url ? <img src={course.image_url} alt={course.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[#176b55]"><ImageIcon size={18} aria-hidden="true" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><Link href={`/admin/courses/${course.id}`} className="block truncate font-semibold text-[#152b2b] hover:text-[#176b55]">{course.title}</Link><p className="mt-1 text-xs text-[#657474]">{course.category}</p></div>
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(course.status)}`}>{statusLabel(course.status)}</span>
                    </div>
                    <p className="mt-2 text-xs text-[#425252]">{course.description.slice(0, 120) || "No description"}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div><dt className="text-[#657474]">Price</dt><dd className="mt-0.5 text-[#152b2b]">₹{course.price.toLocaleString("en-IN")}</dd></div>
                      <div><dt className="text-[#657474]">Duration</dt><dd className="mt-0.5 text-[#152b2b]">{course.duration}</dd></div>
                      <div><dt className="text-[#657474]">Enrollments</dt><dd className="mt-0.5 text-[#152b2b]">{course.enrollment_count}</dd></div>
                      <div><dt className="text-[#657474]">Created</dt><dd className="mt-0.5 text-[#152b2b]">{dateLabel(course.created_at)}</dd></div>
                    </dl>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link href={`/admin/courses/${course.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#176b55] hover:underline"><Eye size={14} aria-hidden="true" />View</Link>
                      <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#176b55] hover:underline" onClick={() => startEdit(course)}><Edit3 size={14} aria-hidden="true" />Edit</button>
                      <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#176b55] hover:underline" onClick={() => toggleStatus(course)} disabled={busyCourse === course.id}>{busyCourse === course.id ? "Working..." : course.status === "published" ? "Draft" : "Publish"}</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border border-[#e1e7e1] bg-white px-4 py-3 text-sm text-[#425252]">
            <div>{total ? `${startRow.toLocaleString("en-IN")}-${endRow.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")}` : "0 results"}</div>
            <div className="flex items-center gap-2">
              <Link href={page > 0 ? pageHref(page - 1) : "#"} className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-semibold ${page > 0 ? "border-[#ccd7ce] text-[#152b2b] hover:bg-[#f5f7f2]" : "pointer-events-none border-[#e5e9e2] text-[#a7b0a8]"}`} aria-disabled={page <= 0}><ArrowLeft size={13} aria-hidden="true" />Prev</Link>
              <span className="inline-flex min-w-9 justify-center rounded bg-[#f3f6f2] px-2 py-1.5 text-xs font-semibold text-[#152b2b]">{page + 1}</span>
              <Link href={endRow < total ? pageHref(page + 1) : "#"} className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-semibold ${endRow < total ? "border-[#ccd7ce] text-[#152b2b] hover:bg-[#f5f7f2]" : "pointer-events-none border-[#e5e9e2] text-[#a7b0a8]"}`} aria-disabled={endRow >= total}>Next<ArrowRight size={13} aria-hidden="true" /></Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
