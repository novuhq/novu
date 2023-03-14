import React, { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { StepTypeEnum } from '@novu/shared';

import { ActivePageEnum } from '../../../constants/editorEnums';
import { IForm, IStepEntity } from '../components/formTypes';

interface ITemplateEditorContext {
  activePage: ActivePageEnum;
  setActivePage: (page: ActivePageEnum) => void;
  selectedNodeId: string;
  setSelectedNodeId: (nodeId: string) => void;
  activeStepIndex: number;
  activeStep?: IStepEntity;
  selectedChannel?: StepTypeEnum;
}

const TemplateEditorContext = React.createContext<ITemplateEditorContext>({
  activePage: ActivePageEnum.SETTINGS,
  setActivePage: () => {},
  selectedNodeId: '',
  setSelectedNodeId: () => {},
  activeStepIndex: -1,
});

export const useTemplateEditorContext = () => React.useContext(TemplateEditorContext);

export const TemplateEditorProvider = ({ children }) => {
  const [activePage, setActivePage] = useState<ActivePageEnum>(ActivePageEnum.SETTINGS);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const { watch } = useFormContext<IForm>();
  const steps = watch('steps');

  const activeStepIndex = useMemo<number>(() => {
    if (selectedNodeId.length === 0) {
      return -1;
    }

    return steps.findIndex((item) => item._id === selectedNodeId || item.id === selectedNodeId);
  }, [selectedNodeId, steps]);

  const activeStep: IStepEntity | undefined = steps[activeStepIndex];

  const value = useMemo(
    () => ({
      activePage,
      setActivePage: (page: ActivePageEnum) => {
        setActivePage(page);
      },
      selectedNodeId,
      setSelectedNodeId: (id: string) => {
        setSelectedNodeId(id);
      },
      activeStepIndex,
      activeStep,
      selectedChannel: activeStep?.template.type,
    }),
    [activePage, selectedNodeId, activeStepIndex, activeStep]
  );

  return <TemplateEditorContext.Provider value={value}>{children}</TemplateEditorContext.Provider>;
};
