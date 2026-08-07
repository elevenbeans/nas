import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components = {
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-clean-blue underline decoration-clean-blue/40 underline-offset-2"
    />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul {...props} className="list-disc pl-5 flex flex-col gap-1.5" />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol {...props} className="list-decimal pl-5 flex flex-col gap-1.5" />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li {...props} className="leading-relaxed" />
  ),
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 {...props} className="font-heading text-lg font-semibold mt-4 mb-2 first:mt-0" />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 {...props} className="font-heading text-[17px] font-semibold mt-4 mb-2 first:mt-0" />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 {...props} className="font-heading text-[15px] font-semibold mt-3 mb-1.5 first:mt-0" />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props} className="leading-relaxed first:mt-0 [&:not(:last-child)]:mb-3" />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong {...props} className="font-semibold" />
  ),
  em: (props: React.HTMLAttributes<HTMLElement>) => (
    <em {...props} className="italic" />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLElement>) => (
    <blockquote {...props} className="border-l-2 border-[#e5e5e7] pl-3 text-apple-muted [&:not(:last-child)]:mb-3" />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code {...props} className="bg-[#f0f0f2] text-apple-text px-1.5 py-0.5 rounded-[6px] text-[13px] font-mono" />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre {...props} className="bg-[#f5f5f7] rounded-[12px] p-3 overflow-x-auto text-[13px] leading-relaxed [&:not(:last-child)]:mb-3 [&>code]:bg-transparent [&>code]:p-0" />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto [&:not(:last-child)]:mb-3">
      <table {...props} className="w-full text-left text-[13px] border-collapse" />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th {...props} className="font-semibold text-apple-text border-b border-[#e5e5e7] py-2 pr-3 text-left" />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td {...props} className="border-b border-[#f0f0f2] py-2 pr-3" />
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr {...props} className="border-[#e5e5e7] [&:not(:last-child)]:mb-3" />
  ),
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
