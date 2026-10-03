import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { Course } from "@/lib/types/public";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="course-card">
      <Link className="course-card-visual" href={`/courses/${course.id}`} aria-label={`View ${course.title}`} style={{ backgroundImage: course.imageUrl ? `linear-gradient(180deg, rgba(21, 43, 43, .02), rgba(21, 43, 43, .34)), url("${course.imageUrl}")` : "linear-gradient(135deg, #dcebdc, #e4e8f4)" }}>
        <span className="course-category">{course.category}</span>
        <span className="course-visual-arrow"><ArrowUpRight size={17} aria-hidden="true" /></span>
      </Link>
      <div className="course-card-body">
        <div className="course-meta"><span><Clock3 size={14} aria-hidden="true" />{course.duration}</span><span>{course.level}</span></div>
        <h3><Link href={`/courses/${course.id}`}>{course.title}</Link></h3>
        <p>{course.description}</p>
        <div className="skill-list" aria-label="Skills covered">{course.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
        <div className="course-card-bottom"><strong>{currency.format(course.price)}</strong><Link href={`/courses/${course.id}`}>View details <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
      </div>
    </article>
  );
}