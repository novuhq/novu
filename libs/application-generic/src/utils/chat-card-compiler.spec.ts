import { describe, expect, it } from 'vitest';
import { chatCardToMarkdownFallback, compileMailyToChatCard } from './chat-card-compiler';

describe('compileMailyToChatCard', () => {
  it('should compile paragraphs with inline marks to markdown text elements', () => {
    const card = compileMailyToChatCard({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'world', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'code', marks: [{ type: 'code' }] },
          ],
        },
      ],
    });

    expect(card).toEqual({
      type: 'card',
      children: [{ type: 'text', content: 'Hello **world** and `code`' }],
    });
  });

  it('should compile link marks to markdown links', () => {
    const card = compileMailyToChatCard({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'docs', marks: [{ type: 'link', attrs: { href: 'https://novu.co' } }] }],
        },
      ],
    });

    expect(card.children).toEqual([{ type: 'text', content: '[docs](https://novu.co)' }]);
  });

  it('should compile headings to bold text elements', () => {
    const card = compileMailyToChatCard({
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] }],
    });

    expect(card.children).toEqual([{ type: 'text', content: '**Title**', style: 'bold' }]);
  });

  it('should compile bullet and ordered lists to markdown lines', () => {
    const card = compileMailyToChatCard({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }] },
          ],
        },
        {
          type: 'orderedList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }] }],
        },
      ],
    });

    expect(card.children).toEqual([
      { type: 'text', content: '- one\n- two' },
      { type: 'text', content: '1. first' },
    ]);
  });

  it('should compile buttons and merge consecutive buttons into one actions row', () => {
    const card = compileMailyToChatCard({
      type: 'doc',
      content: [
        { type: 'button', attrs: { text: 'Approve', url: 'https://example.com/approve' } },
        { type: 'button', attrs: { text: 'Reject', url: 'https://example.com/reject' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'between' }] },
        { type: 'button', attrs: { text: 'Later', url: 'https://example.com/later' } },
      ],
    });

    expect(card.children).toEqual([
      {
        type: 'actions',
        children: [
          { type: 'link-button', label: 'Approve', url: 'https://example.com/approve' },
          { type: 'link-button', label: 'Reject', url: 'https://example.com/reject' },
        ],
      },
      { type: 'text', content: 'between' },
      {
        type: 'actions',
        children: [{ type: 'link-button', label: 'Later', url: 'https://example.com/later' }],
      },
    ]);
  });

  it('should compile divider and image nodes', () => {
    const card = compileMailyToChatCard({
      type: 'doc',
      content: [
        { type: 'horizontalRule' },
        { type: 'image', attrs: { src: 'https://example.com/img.png', alt: 'Logo' } },
      ],
    });

    expect(card.children).toEqual([
      { type: 'divider' },
      { type: 'image', url: 'https://example.com/img.png', alt: 'Logo' },
    ]);
  });

  it('should flatten unknown wrapper nodes and skip empty paragraphs', () => {
    const card = compileMailyToChatCard({
      type: 'doc',
      content: [
        { type: 'paragraph' },
        {
          type: 'section',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'inside section' }] }],
        },
      ],
    });

    expect(card.children).toEqual([{ type: 'text', content: 'inside section' }]);
  });

  it('should compile blockquote and code block', () => {
    const card = compileMailyToChatCard({
      type: 'doc',
      content: [
        { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quoted' }] }] },
        { type: 'codeBlock', content: [{ type: 'text', text: 'const a = 1;' }] },
      ],
    });

    expect(card.children).toEqual([
      { type: 'text', content: '> quoted' },
      { type: 'text', content: '```\nconst a = 1;\n```' },
    ]);
  });

  it('should return an empty card for an empty doc', () => {
    expect(compileMailyToChatCard({ type: 'doc', content: [] })).toEqual({ type: 'card', children: [] });
  });
});

describe('chatCardToMarkdownFallback', () => {
  it('should render buttons as label-url lines, dividers, and images', () => {
    const fallback = chatCardToMarkdownFallback({
      type: 'card',
      children: [
        { type: 'text', content: 'Order **shipped**' },
        { type: 'divider' },
        { type: 'image', url: 'https://example.com/img.png', alt: 'Logo' },
        {
          type: 'actions',
          children: [
            { type: 'link-button', label: 'Track', url: 'https://example.com/track' },
            { type: 'link-button', label: 'Help', url: 'https://example.com/help' },
          ],
        },
      ],
    });

    expect(fallback).toBe(
      'Order **shipped**\n\n---\n\n![Logo](https://example.com/img.png)\n\nTrack: https://example.com/track\n\nHelp: https://example.com/help'
    );
  });

  it('should include title and subtitle', () => {
    const fallback = chatCardToMarkdownFallback({
      type: 'card',
      title: 'Alert',
      subtitle: 'Production',
      children: [{ type: 'text', content: 'CPU is high' }],
    });

    expect(fallback).toBe('**Alert**\n\nProduction\n\nCPU is high');
  });
});
