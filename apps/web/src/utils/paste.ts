export function paste(text: string) {
  const canPasteByExecCommand = typeof document.execCommand === 'function';
  let isPasteDone = false;
  if (canPasteByExecCommand) {
    try {
      document.execCommand('insertText', false, text);
      isPasteDone = true;
    } catch (e) {}
  }

  if (!isPasteDone) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(text));
    selection.collapseToEnd();
  }
}
