import { expect } from 'chai';
import { buildPlanDeliveryMarkdown, renderPlanModelAsMarkdown } from './plan-model-to-markdown';

describe('renderPlanModelAsMarkdown', () => {
  it('renders title and task statuses', () => {
    const markdown = renderPlanModelAsMarkdown({
      title: 'Working',
      tasks: [
        { id: '1', title: 'mcp: search', status: 'completed' },
        { id: '2', title: 'Thinking…', status: 'in_progress' },
      ],
    });

    expect(markdown).to.equal('📋 **Working**\n\n✅ `mcp: search`\n🔄 `Thinking…`');
  });

  it('uses brain emoji for thinking title and hides synthetic thinking task', () => {
    const markdown = renderPlanModelAsMarkdown({
      title: 'Thinking…',
      tasks: [
        { id: '1', title: 'Linear: save_issue', status: 'complete' },
        { id: '__thinking__', title: 'Thinking…', status: 'in_progress' },
      ],
    });

    expect(markdown).to.equal('🧠 **Thinking…**\n\n✅ `Linear: save_issue`');
  });

  it('uses checkmark for finished thinking title', () => {
    const markdown = renderPlanModelAsMarkdown({
      title: 'Finished thinking',
      tasks: [{ id: '1', title: 'Linear: save_issue', status: 'complete' }],
    });

    expect(markdown).to.equal('✅ **Finished thinking**\n\n✅ `Linear: save_issue`');
  });

  it('defaults title when missing', () => {
    const markdown = renderPlanModelAsMarkdown({ title: '', tasks: [] });

    expect(markdown).to.equal('📋 **Plan**');
  });

  it('buildPlanDeliveryMarkdown never returns empty', () => {
    const markdown = buildPlanDeliveryMarkdown({ title: '', tasks: [] });

    expect(markdown.trim().length).to.be.greaterThan(0);
  });
});
