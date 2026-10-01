import { Download, ExternalLink, Link2, Paperclip } from 'lucide-react';
import type { RequestAnswer } from '@/types/requests';

/* A request's form answers: each question above its answer, full width —
   the forms' questions run long ("Date for mass emailing to be released"),
   and squeezing them into a side column wrapped them into three lines of
   capitals. Link answers gather into buttons underneath — on one row with
   the request's files, when `files` is given. Shared by the requests page
   and the tasks board's task dialog. */
export default function RequestAnswers({
  answers,
  files = [],
  onDownload,
}: {
  answers: RequestAnswer[];
  files?: { id: number; fileName: string }[];
  onDownload?: (file: { id: number; fileName: string }) => void;
}) {
  const textAnswers = answers.filter((answer) => !answer.link);
  const linkAnswers = answers.filter((answer) => answer.link);
  if (textAnswers.length === 0 && linkAnswers.length === 0 && files.length === 0) return null;
  const buttonsLabel =
    linkAnswers.length > 0 && files.length > 0 ? 'Links and files' : linkAnswers.length > 0 ? 'Links' : 'Files';

  return (
    <div>
      {textAnswers.length > 0 && (
        <dl className="divide-y divide-gray-100">
          {textAnswers.map((answer) => (
            <div key={answer.label} className="py-3">
              <dt className="text-[13px] font-semibold text-gray-500">{answer.label}</dt>
              <dd className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-gray-900">{answer.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(linkAnswers.length > 0 || files.length > 0) && (
        <div className={`py-3 ${textAnswers.length > 0 ? 'border-t border-gray-100' : ''}`}>
          <span className="text-[13px] font-semibold text-gray-500">{buttonsLabel}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {linkAnswers.map((answer) => (
              <a
                key={answer.label}
                href={answer.link!.href}
                target="_blank"
                rel="noopener noreferrer"
                title={answer.link!.href}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-[#3D6C94] transition-colors hover:border-[#B1C9DC] hover:bg-[#B1C9DC]/10"
              >
                <Link2 className="h-4 w-4 shrink-0" />
                {answer.link!.label}
                <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
              </a>
            ))}
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => onDownload?.(file)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#B1C9DC] hover:text-[#3D6C94]"
              >
                <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                {file.fileName}
                <Download className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
