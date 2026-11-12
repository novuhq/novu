import { expect } from 'chai';
import { buildHumanTestEmail } from './human-test-email.template';

describe('buildHumanTestEmail', () => {
  it('introduces the agent and asks for a reply', () => {
    const content = buildHumanTestEmail({
      sender: { agentName: 'Atlas', operatorName: 'Dima Grossman' },
      operatorFirstName: 'Dima',
    });

    expect(content.subject).to.equal('Hi, I’m Atlas');
    expect(content.html).to.include('Hi Dima,');
    expect(content.html).to.include('This is my first email from my very own inbox.');
    expect(content.html).to.include('Just hit reply. Even “hi” counts.');
    expect(content.html).to.include('Sent as a test from your Agent Inbox setup. Yes, it’s a real email.');
    expect(content.html).to.include('Atlas is an AI agent run by Dima Grossman. It was very excited to send this.');
    expect(content.html.toLowerCase()).to.not.include('novu');
    expect(content.text).to.include('Just hit reply. Even “hi” counts.');
  });

  it('escapes the name in the HTML only', () => {
    const content = buildHumanTestEmail({ sender: { agentName: 'Vasya <script>' } });

    expect(content.subject).to.equal('Hi, I’m Vasya <script>');
    expect(content.html).to.include('Hi, I’m Vasya &lt;script&gt;');
    expect(content.text).to.not.include('&lt;');
  });

  it('stays generic with no names', () => {
    const content = buildHumanTestEmail({ sender: {} });

    expect(content.subject).to.equal('Hi, I’m your agent');
    expect(content.html).to.include('Hi,');
    expect(content.html).to.include('Your agent is an AI agent. It was very excited to send this.');
  });
});
