interface AnnouncementRowProps {
  posterName: string;    // e.g. "Ethan"
  posterRole: string;    // e.g. "Socials VP"
  posterAvatar: string;  // profile picture URL
  image?: string;        // optional announcement image URL
  description: string;   // the announcement body text
}

export default function AnnouncementRow({
  posterName,
  posterRole,
  posterAvatar,
  image,
  description,
}: AnnouncementRowProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Poster header */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <img
          src={posterAvatar}
          alt={posterName}
          className="h-9 w-9 shrink-0 rounded-full border border-gray-200 object-cover"
        />
        <p className="text-sm font-bold text-gray-900">
          {posterName} <span className="text-gray-400">|</span> {posterRole}
        </p>
      </div>

      {/* Announcement image */}
      {image && (
        <img src={image} alt="" className="w-full object-cover" />
      )}

      {/* Description */}
      <div className="flex items-end justify-between gap-4 px-5 py-4">
        <p className="font-mono text-sm leading-relaxed text-gray-800">
          {description}
        </p>
        <button className="shrink-0 text-2xl leading-none text-gray-400 transition-colors hover:text-gray-600">
          …
        </button>
      </div>
    </div>
  );
}