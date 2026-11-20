import { expect } from 'chai';
import { sanitizeInAppContent } from './sanitize-in-app-content';

describe('sanitizeInAppContent', () => {
  it('strips event handler attributes from injected HTML', () => {
    const payload = '<img src=x onerror="var i=document.createElement(\'iframe\');document.body.appendChild(i)">';

    const result = sanitizeInAppContent(payload);

    expect(result).to.not.include('onerror');
    expect(result).to.not.include('createElement');
  });

  it('removes script tags and javascript: URLs', () => {
    const result = sanitizeInAppContent('<script>alert(1)</script><a href="javascript:alert(1)">x</a>');

    expect(result).to.not.include('<script');
    expect(result).to.not.include('javascript:');
  });

  it('keeps safe formatting HTML', () => {
    expect(sanitizeInAppContent('Hello <b>world</b>')).to.equal('Hello <b>world</b>');
  });

  it('returns plain-text content unchanged', () => {
    const content = 'Tom & Jerry **bold** said "hi" > there';

    expect(sanitizeInAppContent(content)).to.equal(content);
  });

  it('handles empty content', () => {
    expect(sanitizeInAppContent('')).to.equal('');
  });
});
