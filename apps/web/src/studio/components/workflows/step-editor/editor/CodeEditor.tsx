import Editor from '@monaco-editor/react';

const CodeEditor = ({ code, setCode }) => {
  // return <Editor height="90vh" language="javascript" value={code} onChange={(value) => setCode(value)} />;
  return <Editor height="200px" language="javascript" value={code} onChange={(value) => setCode(value)} />;
};

export default CodeEditor;
