import Editor from '@monaco-editor/react';

const CodeEditor = ({ code, setCode }) => {
  return <Editor language="javascript" value={code} onChange={(value) => setCode(value)} />;
};

export default CodeEditor;
