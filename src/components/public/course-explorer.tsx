"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { CourseCard } from "@/components/public/course-card";
import type { Course, CourseLevel } from "@/lib/types/public";
import type { DataSource } from "@/lib/services/result";

type PriceSort = "recommended" | "low-high" | "high-low";

export function CourseExplorer({ courses, categories, source, error }: { courses: Course[]; categories: string[]; source: DataSource; error?: string | null }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [level, setLevel] = useState("All levels");
  const [priceSort, setPriceSort] = useState<PriceSort>("recommended");

  const visibleCourses = courses
    .filter((course) => course.status === "published")
    .filter((course) => category === "All categories" || course.category === category)
    .filter((course) => level === "All levels" || course.level === (level as CourseLevel))
    .filter((course) => `${course.title} ${course.description} ${course.skills.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((first, second) => {
      if (priceSort === "recommended") return 0;
      if (priceSort === "low-high") return first.price - second.price;
      if (priceSort === "high-low") return second.price - first.price;
      return 0;
    });

  return (
    <>
      <section className="filter-panel shell" aria-label="Filter courses">
        <div className="filter-panel-heading"><SlidersHorizontal size={17} aria-hidden="true" /><span>Find your course</span>{source === "demo" ? <span className="filter-demo-tag">Sample catalogue</span> : null}</div>
        <div className="filter-grid course-filter-grid">
          <label className="filter-search"><span>Search courses</span><span className="input-with-icon"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try Python or analytics" /></span></label>
          <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Level</span><select value={level} onChange={(event) => setLevel(event.target.value)}>{["All levels", "Beginner", "Intermediate", "Advanced"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Price</span><select value={priceSort} onChange={(event) => setPriceSort(event.target.value as PriceSort)}><option value="recommended">Recommended</option><option value="low-high">Lowest first</option><option value="high-low">Highest first</option></select></label>
        </div>
      </section>
      <div className="catalog-results shell" aria-live="polite"><span>{visibleCourses.length} courses</span><span>{source === "demo" ? "Fees shown are illustrative" : "Published course fees"}</span></div>
      {error ? (
        <div className="empty-state shell" role="status"><Search size={22} aria-hidden="true" /><h2>Courses aren’t available right now</h2><p>Please try again later.</p></div>
      ) : visibleCourses.length ? (
        <div className="course-grid shell">{visibleCourses.map((course) => <CourseCard course={course} key={course.id} />)}</div>
      ) : (
        <div className="empty-state shell"><Search size={22} aria-hidden="true" /><h2>{search || category !== "All categories" || level !== "All levels" ? "No courses match those filters" : "No courses are published yet"}</h2><p>{search || category !== "All categories" || level !== "All levels" ? "Try another search or choose a broader category." : "Please check back soon."}</p>{search || category !== "All categories" || level !== "All levels" ? <button className="button button-outline" onClick={() => { setSearch(""); setCategory("All categories"); setLevel("All levels"); setPriceSort("recommended"); }}>Clear filters</button> : null}</div>
      )}
    </>
  );
}