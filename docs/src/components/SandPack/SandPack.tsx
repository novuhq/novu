/* eslint-disable @typescript-eslint/naming-convention */
import React from 'react';
import { Sandpack, SandpackProviderProps } from '@codesandbox/sandpack-react';

const SandPack = (props: SandpackProviderProps) => {
  const { template, options, files } = props;

  const templateDependency = (_template: string) => {
    switch (_template) {
      case 'react':
      case 'react-ts':
        return { '@novu/notification-center': 'latest' };
      case 'vue':
      case 'vue-ts':
        return { '@novu/notification-center-vue': 'latest' };
      case 'angular':
        return { '@novu/notification-center-angular': 'latest' };
      default:
        return {};
    }
  };

  const templateDevDependency = (_template: string) => {
    switch (_template) {
      case 'angular':
        return { '@types/react': 'latest' };
      default:
        return {};
    }
  };

  return (
    <Sandpack
      theme={'dark'}
      template={template}
      files={files}
      options={{
        wrapContent: true,
        editorHeight: 600,
        autoReload: true,
        autorun: false,
        showLineNumbers: true,
        ...options,
      }}
      customSetup={{
        dependencies: templateDependency(template),
        devDependencies: templateDevDependency(template),
      }}
    />
  );
};

export default SandPack;
