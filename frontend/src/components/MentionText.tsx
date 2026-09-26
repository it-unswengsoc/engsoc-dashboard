import { splitMentions } from '@/lib/mentions';

/* Renders free text with "@Name"/"@Portfolio" runs highlighted — cosmetic
   only, see lib/mentions.ts for why this doesn't (and can't, without a
   round-trip) know which ones are real mentions. */
export default function MentionText({ content }: { content: string }) {
  return (
    <>
      {splitMentions(content).map((segment, i) =>
        segment.isMention ? (
          <span key={i} className="font-bold text-[#3D6C94]">
            {segment.text}
          </span>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </>
  );
}
