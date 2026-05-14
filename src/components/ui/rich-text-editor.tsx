import React, { useEffect, useState, useRef, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontSize from "@tiptap/extension-font-size";
import FontFamily from "@tiptap/extension-font-family";
import { cn } from "@/lib/utils";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Autoformat, AutoImage, AutoLink,
  Bold, BalloonToolbar,
  CloudServices, Code, CodeBlock,
  Emoji, Essentials,
  FontColor, FontFamily as CKFontFamily, FontSize as CKFontSize,
  GeneralHtmlSupport,
  Heading, HtmlComment,
  ImageBlock, ImageCaption, ImageInline, ImageStyle,
  ImageTextAlternative, ImageToolbar, Italic,
  Link as CKLink, LinkImage, List,
  Mention, Paragraph,
  ShowBlocks, SourceEditing, Strikethrough, Style,
  TextTransformation, Underline as CKUnderline,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';


const LICENSE_KEY = 'GPL';

interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean | null;
  children: React.ReactNode;
  title?: string;
}

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  useEditor?: 'tiptap' | 'ckeditor'; // strategy
  ckeditorLicenseKey?: string;
  /** Use compact UI (no menu bar, simpler toolbar) for narrow containers */
  compact?: boolean;
}

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'Georgia', value: 'Georgia, serif' }
];
const FONT_SIZES = [
  '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'
];
const ToolbarButton = ({ onClick, disabled, active, children, title }: ToolbarButtonProps) => (
    <button
    type="button"
    className={cn(
      "cursor-pointer flex items-center justify-center w-8 h-8 rounded-full mx-0.5 text-lg transition border border-transparent",
      active ? "bg-primary/80 text-white" : "text-zinc-700 bg-zinc-100 hover:bg-primary/10 hover:text-primary",
      disabled && "opacity-40 cursor-not-allowed"
    )}
    style={{ boxShadow: active ? '0 2px 8px 0 #0000000A' : undefined }}
    onClick={onClick}
    disabled={disabled}
    title={title}
    tabIndex={-1}
  >
    {children}
  </button>
);

const TiptapEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder = "Start typing...", className }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
      Highlight,
      FontSize,
      FontFamily,
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'min-h-[160px] p-3 focus:outline-none bg-background',
        style: 'font-family: inherit; font-size: inherit;'
      },
    },
  });
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value, {});
    }
  }, [value]);
  const insertLink = () => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const insertCustomHtml = () => {
    const html = window.prompt('Enter custom HTML:');
    if (html && editor) {
      editor.commands.insertContent(html);
    }
  };
  const icons = {
    bold: <span style={{ fontWeight: 'bold' }}>B</span>,
    italic: <span style={{ fontStyle: 'italic' }}>I</span>,
    underline: <span style={{ textDecoration: 'underline', fontWeight: 500 }}>U</span>,
    highlight: <span style={{ background: '#ffe066', borderRadius: 3 }}>H</span>,
    bullet: <span>&bull; </span>,
    ordered: <span>1.</span>,
    // image: <span role="img" aria-label="image">🖼️</span>,
    link: <span role="img" aria-label="link">🔗</span>,
    html: <span role="img" aria-label="html">🔣</span>
  };
  const isActive = (cmd: string) => editor?.isActive(cmd);
  return (
    <div className={cn('rounded-xl shadow ring-1 ring-zinc-200 bg-white', className)} style={{ margin: '0 auto' }}>
      <div className="flex flex-wrap items-center p-1 gap-y-1 gap-x-0 border-b bg-white/90 rounded-t-xl sticky top-0 z-10" style={{ boxShadow: '0 2px 16px 0 #0001' }}>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor} active={isActive('bold')} title="Bold">{icons.bold}</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor} active={isActive('italic')} title="Italic">{icons.italic}</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={!editor} active={isActive('underline')} title="Underline">{icons.underline}</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHighlight().run()} disabled={!editor} active={isActive('highlight')} title="Highlight">{icons.highlight}</ToolbarButton>
        <span className="mx-2 w-px h-6 bg-zinc-200"></span>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor} active={isActive('bulletList')} title="Bulleted List">{icons.bullet}</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor} active={isActive('orderedList')} title="Numbered List">{icons.ordered}</ToolbarButton>
        <span className="mx-2 w-px h-6 bg-zinc-200"></span>
        <ToolbarButton onClick={insertLink} disabled={!editor} active={isActive('link')} title="Insert Link">{icons.link}</ToolbarButton>
        <ToolbarButton onClick={insertCustomHtml} disabled={!editor} title="Insert Custom HTML">{icons.html}</ToolbarButton>
        <span className="mx-2 w-px h-6 bg-zinc-200"></span>
        <select
          className="border-none bg-zinc-100 hover:bg-zinc-200 rounded-full px-3 py-1 text-sm mx-1 focus:outline focus:ring focus:border-primary/40 min-w-[90px]"
          onChange={e => editor?.chain().focus().setFontFamily(e.target.value).run()}
          value={editor?.getAttributes('textStyle').fontFamily ?? ''}
          disabled={!editor}
          title="Font Family"
        >
          {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select
          className="border-none bg-zinc-100 hover:bg-zinc-200 rounded-full px-3 py-1 text-sm mx-1 focus:outline focus:ring focus:border-primary/40 min-w-[74px]"
          onChange={e => editor?.chain().focus().setFontSize(e.target.value).run()}
          value={editor?.getAttributes('textStyle').fontSize || ''}
          disabled={!editor}
          title="Font Size"
        >
          <option value="">Size</option>
          {FONT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
        </select>
        <input
          type="color"
          onChange={e => editor?.chain().focus().setColor(e.target.value).run()}
          value={editor?.getAttributes('textStyle').color || '#000000'}
          disabled={!editor}
          title="Text Color"
          className="mx-1 w-6 h-6 rounded-full border-none shadow focus:ring-2 ring-primary/30 cursor-pointer"
        />
        <input
          type="color"
          onChange={e => editor?.chain().focus().setHighlight({ color: e.target.value }).run()}
          value={editor?.getAttributes('highlight').color || '#ffffff'}
          disabled={!editor}
          title="Highlight/Background Color"
          className="mx-1 w-6 h-6 rounded-full border-none shadow focus:ring-2 ring-primary/30 cursor-pointer"
        />
      </div>
      <div className="relative p-1">
        <EditorContent
          content={value}
          editor={editor}
          className="rounded-lg focus:ring-2 ring-primary/30 shadow-inner"
          style={{ fontFamily: editor?.getAttributes('textStyle').fontFamily, fontSize: editor?.getAttributes('textStyle').fontSize }}

        />
        {editor && editor.isEmpty && !editor.isFocused && !value && !!placeholder && (
          <div
            className="absolute top-2 left-3 pointer-events-none text-zinc-400 select-none opacity-70 text-base font-normal z-10"
            style={{ letterSpacing: '0.01em' }}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
};

const CKEditorEditor: React.FC<RichTextEditorProps> = React.memo(({
  value, onChange, placeholder, compact
}) => {
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const toolbarItems = compact
      ? ['undo', 'redo', '|', 'bold', 'italic', 'underline', '|', 'link', '|', 'bulletedList', 'numberedList']
      : [
          'undo',
          'redo',
          '|',
          'sourceEditing',
          'showBlocks',
          '|',
          'heading',
          // 'style',
          '|',
          'fontSize',
          'fontFamily',
          'fontColor',
          '|',
          'bold',
          'italic',
          'underline',
          'strikethrough',
          'code',
          '|',
          'emoji',
          'link',
          'codeBlock',
          '|',
          'bulletedList',
          'numberedList'
        ];

      const editorConfig = {
        licenseKey: LICENSE_KEY,
        toolbar: {
          items: toolbarItems,
          shouldNotGroupWhenFull: false
        },
        plugins: [
          Autoformat,
          AutoImage,
          AutoLink,
          BalloonToolbar,
          Bold,
          CloudServices,
          Code,
          CodeBlock,
          Emoji,
          Essentials,
          CKFontFamily, 
          CKFontSize, 
          FontColor,
          GeneralHtmlSupport,
          Heading,
          HtmlComment,
          ImageBlock,
          ImageCaption,
          ImageInline,
          ImageStyle,
          ImageTextAlternative,
          ImageToolbar,
          Italic,
          CKLink,
          LinkImage,
          List,
          Mention,
          Paragraph,
          ShowBlocks,
          SourceEditing,
          Strikethrough,
          Style,
          TextTransformation,
          CKUnderline,
        ],
        balloonToolbar: ['bold', 'italic', '|', 'link', '|', 'bulletedList', 'numberedList'],
        fontFamily: {
          supportAllValues: true
        },
        fontSize: {
          options: [10, 'default', 14, 16, 18, 20, 22],
          supportAllValues: true
        },
        heading: {
          options: [
            {
              model: 'heading1' as const,
              view: 'h1',
              title: 'Heading 1',
              class: 'ck-heading_heading1'
            },
            {
              model: 'heading2' as const,
              view: 'h2',
              title: 'Heading 2',
              class: 'ck-heading_heading2'
            },
            {
              model: 'heading3' as const,
              view: 'h3',
              title: 'Heading 3',
              class: 'ck-heading_heading3'
            },
            {
              model: 'heading4' as const,
              view: 'h4',
              title: 'Heading 4',
              class: 'ck-heading_heading4'
            },
            {
              model: 'heading5' as const,
              view: 'h5',
              title: 'Heading 5',
              class: 'ck-heading_heading5'
            },
            {
              model: 'heading6' as const,
              view: 'h6',
              title: 'Heading 6',
              class: 'ck-heading_heading6'
            }
          ]
        },
        htmlSupport: {
          allow: [
            {
              name: /^.*$/,
              styles: true,
              attributes: true,
              classes: true
            }
          ]
        },
    initialData: initialValueRef.current || '',
        link: {
          addTargetToExternalLinks: true,
          defaultProtocol: 'https://',
          decorators: {
            toggleDownloadable: {
              mode: 'manual',
              label: 'Downloadable',
              attributes: {
                download: 'file'
              }
            }
          }
        },
        mention: {
          feeds: [
            {
              marker: '@',
              feed: [
                /* See: https://ckeditor.com/docs/ckeditor5/latest/features/mentions.html */
              ]
            }
          ]
        },
        menuBar: {
          isVisible: !compact
        },
        placeholder: 'Type or paste your content here!',
        style: {
          definitions: [
            {
              name: 'Article category',
              element: 'h3',
              classes: ['category']
            },
            {
              name: 'Title',
              element: 'h2',
              classes: ['document-title']
            },
            {
              name: 'Subtitle',
              element: 'h3',
              classes: ['document-subtitle']
            },
            {
              name: 'Info box',
              element: 'p',
              classes: ['info-box']
            },
            {
              name: 'Marker',
              element: 'span',
              classes: ['marker']
            },
            {
              name: 'Spoiler',
              element: 'span',
              classes: ['spoiler']
            }
          ]
      }
    };

  return (
    <div className={cn("main-container", compact && "richtext-compact")}>
      <div className="editor-container editor-container_classic-editor editor-container_include-style">
        <div className="editor-container__editor">
        <CKEditor
            editor={ClassicEditor}
            config={editorConfig}
            onChange={(_, editor) => {
            onChangeRef.current?.(editor.getData());
          }}
        />
        </div>
      </div>
    </div>
  );
}, (prev, next) => prev.compact === next.compact);

export const RichTextEditor: React.FC<RichTextEditorProps> = (props) => {
  const [activeEditor] = useState<'tiptap' | 'ckeditor'>(props.useEditor || 'ckeditor');
  return (
    <div>
      {/* <div className="flex mb-2 gap-2 items-center">
        <button
          type="button"
          onClick={() => setActiveEditor('tiptap')}
          className={cn("px-4 py-1 rounded-md border text-sm transition", activeEditor === 'tiptap' ? "bg-primary text-white border-primary" : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50")}
        >
          Tiptap Editor
        </button>
        <button
          type="button"
          onClick={() => setActiveEditor('ckeditor')}
          className={cn("px-4 py-1 rounded-md border text-sm transition", activeEditor === 'ckeditor' ? "bg-primary text-white border-primary" : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50")}
        >
          CKEditor 5
        </button>
        <span className="text-xs ml-3 text-zinc-400">(Switch at any time – content persists in either editor)</span>
      </div> */}
      {activeEditor === 'tiptap' && <TiptapEditor {...props} />}
      {activeEditor === 'ckeditor' && <CKEditorEditor {...props} compact={props.compact} />}
    </div>
  );
};

export default RichTextEditor;
