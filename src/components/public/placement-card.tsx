/* eslint-disable @next/next/no-img-element -- Private-bucket signed URLs are short-lived and runtime-generated. */
import type { PlacementStory } from "@/lib/types/public";
import { UserRound } from "lucide-react";

export function PlacementCard({ story }: { story: PlacementStory }) {
  return (
    <article className="placement-card">
      <div className="placement-card-photo">
        {story.imageUrl
          ? <img src={story.imageUrl} alt={`${story.candidate} placement photo`} className="h-44 w-full object-cover" />
          : <span className="grid h-44 w-full place-items-center bg-[#f0f3ef] text-[#829188]" aria-label="No placement photo"><UserRound size={34} aria-hidden="true" /></span>}
      </div>
      <div className="placement-person">
        <div className="min-w-0">
          <strong>{story.candidate}</strong>
          <small>{story.role} · {story.year}</small>
        </div>
      </div>
      <p className="placement-description">{story.description}</p>
      <dl className="placement-outcome">
        <div><dt>Company</dt><dd>{story.company}</dd></div>
        {story.course ? <div><dt>Course</dt><dd>{story.course}</dd></div> : null}
      </dl>
    </article>
  );
}