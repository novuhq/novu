import { expect } from 'chai';
import { buildHumanTestEmail } from './human-test-email.template';

describe('buildHumanTestEmail', () => {
  it('introduces the agent in the Agent Inbox mail and asks for a reply', () => {
    const content = buildHumanTestEmail({ agentName: 'Vasya <script>' });

    expect(content.subject).to.equal('Hi, I’m Vasya <script>');
    expect(content.html).to.include(
      'Hi, I’m <span style="color:#ff5c30;font-style:italic;">Vasya &lt;script&gt;</span>'
    );
    expect(content.html).to.include('Reply to this email. Your reply lands in my inbox.');
    expect(content.html).to.include('#000000');
    expect(content.html).to.include('agent inbox');
    expect(content.html).to.not.match(/\b[Hh]uman\b/);
    expect(content.html.toLowerCase()).to.not.include('powered by novu');
    expect(content.text).to.include('Hi, I’m Vasya <script>');
    expect(content.text).to.not.include('&lt;');
  });
});
