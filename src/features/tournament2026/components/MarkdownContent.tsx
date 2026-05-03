import ReactMarkdown from 'react-markdown';

export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="text-sm leading-6 text-[#E6EDF3]">
      <ReactMarkdown
        components={{
          h1: ({ children: content }) => <p className="font-bold text-[#FAFAFA]">{content}</p>,
          h2: ({ children: content }) => <p className="font-bold text-[#FAFAFA]">{content}</p>,
          h3: ({ children: content }) => <p className="font-bold text-[#FAFAFA]">{content}</p>,
          p: ({ children: content }) => <p className="mt-2 first:mt-0">{content}</p>,
          strong: ({ children: content }) => <strong className="font-bold text-[#FAFAFA]">{content}</strong>,
          em: ({ children: content }) => <em className="text-[#A1A1AA]">{content}</em>,
          ul: ({ children: content }) => <ul className="mt-2 list-disc space-y-1 pl-4">{content}</ul>,
          ol: ({ children: content }) => <ol className="mt-2 list-decimal space-y-1 pl-4">{content}</ol>,
          li: ({ children: content }) => <li>{content}</li>,
          code: ({ children: content }) => (
            <code className="rounded border border-[#27272A] bg-[#18181B] px-1 py-0.5 text-[0.85em] text-[#3FB950]">
              {content}
            </code>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
