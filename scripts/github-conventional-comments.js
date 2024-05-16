/* eslint-disable max-len */

/**
 * Novu Conventional Comments as GitHub Saved Replies
 * Based on https://gist.github.com/ifyoumakeit/4148a8c3e61b7868935651272c03f793
 *
 * To install:
 * 1. Go to https://github.com/settings/replies
 * 2. Open Developer Tools
 * 3. Paste and run below code in JavaScript console
 */

(async function generateReplies(document) {
  // https://conventionalcomments.org/#labels
  const LABEL = {
    praise: 'praise',
    note: 'note',
    nitpick: 'nitpick',
    thought: 'thought',
    suggestion: 'suggestion',
    question: 'question',
    chore: 'chore',
    issue: 'issue',
  };

  const NON_BLOCKING = [LABEL.nitpick, LABEL.thought, LABEL.note];

  const COMMENT = {
    [LABEL.praise]:
      'Praises highlight something positive. Try to leave at least one of these comments per review. Do not leave false praise (which can actually be damaging). Do look for something to sincerely praise.',
    [LABEL.note]: 'Notes are always non-blocking and simply highlight something the reader should take note of.',
    [LABEL.nitpick]: 'Nitpicks are trivial preference-based requests. These should be non-blocking by nature.',
    [LABEL.thought]:
      'Thoughts represent an idea that popped up from reviewing. These comments are non-blocking by nature, but they are extremely valuable and can lead to more focused initiatives and mentoring opportunities.',
    [LABEL.suggestion]:
      "Suggestions propose improvements to the current subject. It's important to be explicit and clear on what is being suggested and why it is an improvement. Consider using patches and the blocking or non-blocking decorations to further communicate your intent.",
    [LABEL.question]:
      "Questions are appropriate if you have a potential concern but are not quite sure if it's relevant or not. Asking the author for clarification or investigation can lead to a quick resolution.",
    [LABEL.chore]:
      'Chores are simple tasks that must be done before the subject can be “officially” accepted. Usually, these comments reference some common process. Try to leave a link to the process description so that the reader knows how to resolve the chore.',
    [LABEL.issue]:
      'Issues highlight specific problems with the subject under review. These problems can be user-facing or behind the scenes. It is strongly recommended to pair this comment with a suggestion. If you are not sure if a problem exists or not, consider leaving a question.',
  };

  const EMOJI = {
    [LABEL.praise]: '\u{1F44F}',
    [LABEL.note]: '\u{1F5D2}',
    [LABEL.nitpick]: '\u{1F913}',
    [LABEL.thought]: '\u{1F4AD}',
    [LABEL.suggestion]: '\u{270F}',
    [LABEL.question]: '\u{2753}',
    [LABEL.chore]: '\u{2611}',
    [LABEL.issue]: '\u{26A0}',
  };

  function post(key, token) {
    const blockingText = NON_BLOCKING.includes(key) ? ' (non-blocking)' : '';

    return fetch('replies', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      body: new URLSearchParams({
        body: `<!-- ${COMMENT[key]}  -->\n${EMOJI[key]} **${key}${blockingText}:** ‏`,
        authenticity_token: token,
        title: `${key[0].toUpperCase()}${key.slice(1)}${blockingText}`,
      }).toString(),
    });
  }

  const form = document.querySelector('.new_saved_reply');
  const token = form.querySelector('[name=authenticity_token]').value;
  // Replies are order alphabetically, so order doesn't need to preserved.
  await Promise.all(Object.keys(LABEL).map((key) => post(key, token)));
  console.log('All added! Refresh the page!');
})(window.document);
