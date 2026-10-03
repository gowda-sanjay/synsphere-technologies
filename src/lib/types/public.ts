export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";

export type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  price: number;
  skills: string[];
  level: CourseLevel;
  imageUrl: string | null;
  status: "published" | "draft";
  curriculum: string[];
  requirements: string[];
};

export type Job = {
  id: string;
  title: string;
  company: string;
  companyId: string;
  location: string;
  jobType: string;
  experience: string;
  salary: string;
  skills: string[];
  description: string;
  deadline: string | null;
  postedDate: string;
  status: "open" | "closed";
};

export type Company = {
  id: string;
  name: string;
  initials: string;
  industry: string;
  location: string;
  description: string;
  accent: string;
};

export type PlacementStory = {
  id: string;
  candidate: string;
  role: string;
  company: string;
  course: string | null;
  year: number;
  description: string;
  imageUrl?: string | null;
};