import { ChannelTypeEnum, INotificationTrigger } from '@novu/shared';
import { createContext, useContext, useReducer } from 'react';

const actionEditMode = 'editMode';
const actionIsDirty = 'isDirty';
const actionIsEmbedModalVisible = 'isEmbedModalVisible';
const actionTrigger = 'trigger';
const actionSelectedMessageType = 'selectedMessageType';
const actionActiveChannels = 'activeChannels';

const reducer = (state, action) => {
  switch (action.type) {
    case actionEditMode:
      return {
        ...state,
        editMode: action.payload,
      };
    case actionIsDirty:
      return {
        ...state,
        isDirty: action.payload,
      };
    case actionIsEmbedModalVisible:
      return {
        ...state,
        isEmbedModalVisible: action.payload,
      };
    case actionTrigger:
      return {
        ...state,
        trigger: action.payload,
      };
    case actionSelectedMessageType:
      return {
        ...state,
        selectedMessageType: action.payload,
      };
    case actionActiveChannels:
      return {
        ...state,
        activeChannels: {
          ...state.activeChannels,
          ...action.payload,
        },
      };
    default:
      throw new Error('Unspecified reducer action');
  }
};

const TemplateEditorContext = createContext({
  editMode: true,
  setEditMode: (editMode: boolean) => {},
  isDirty: false,
  setIsDirty: (isDirty: boolean) => {},
  isEmbedModalVisible: false,
  setIsEmbedModalVisible: (isEmbedModalVisible: boolean) => {},
  trigger: undefined,
  setTrigger: (trigger: INotificationTrigger) => {},
  selectedMessageType: null,
  setSelectedMessageType: (selectedMessageType: ChannelTypeEnum | null) => {},
  activeChannels: {
    [ChannelTypeEnum.IN_APP]: false,
    [ChannelTypeEnum.EMAIL]: false,
    [ChannelTypeEnum.SMS]: false,
  },
  setActiveChannels: (activeChannels: { [key: string]: boolean }) => {},
} as {
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  isEmbedModalVisible: boolean;
  setIsEmbedModalVisible: (isEmbedModalVisible: boolean) => void;
  trigger: INotificationTrigger | undefined;
  setTrigger: (trigger: INotificationTrigger) => void;
  selectedMessageType: ChannelTypeEnum | null;
  setSelectedMessageType: (selectedMessageType: ChannelTypeEnum | null) => void;
  activeChannels: {
    [ChannelTypeEnum.IN_APP]: boolean;
    [ChannelTypeEnum.EMAIL]: boolean;
    [ChannelTypeEnum.SMS]: boolean;
  };
  setActiveChannels: (activeChannels: { [key: string]: boolean }) => void;
  [key: string]: any;
});

const { Provider } = TemplateEditorContext;

const TemplateEditorProvider = ({ children }) => {
  const [state, dispatch]: [any, any] = useReducer(reducer, {
    editMode: true,
    isDirty: false,
    isEmbedModalVisible: false,
    trigger: undefined,
    selectedMessageType: null,
    activeChannels: { [ChannelTypeEnum.IN_APP]: false, [ChannelTypeEnum.EMAIL]: false, [ChannelTypeEnum.SMS]: false },
  });

  const setEditMode = (editMode: boolean) => {
    dispatch({
      type: actionEditMode,
      payload: editMode,
    });
  };

  const setIsDirty = (isDirty: boolean) => {
    dispatch({
      type: actionIsDirty,
      payload: isDirty,
    });
  };

  const setIsEmbedModalVisible = (isEmbedModalVisible: boolean) => {
    dispatch({
      type: actionIsEmbedModalVisible,
      payload: isEmbedModalVisible,
    });
  };

  const setTrigger = (trigger: INotificationTrigger) => {
    dispatch({
      type: actionTrigger,
      payload: trigger,
    });
  };

  const setSelectedMessageType = (selectedMessageType: ChannelTypeEnum | null) => {
    dispatch({
      type: actionTrigger,
      payload: selectedMessageType,
    });
  };

  const setActiveChannels = (activeChannels: { [key: string]: boolean }) => {
    dispatch({
      type: actionTrigger,
      payload: activeChannels,
    });
  };

  return (
    <Provider
      value={{
        setActiveChannels,
        setTrigger,
        setIsDirty,
        setEditMode,
        setIsEmbedModalVisible,
        setSelectedMessageType,
        selectedMessageType: state.selectedMessageType,
        editMode: state.editMode,
        isDirty: state.isDirty,
        isEmbedModalVisible: state.isEmbedModalVisible,
        trigger: state.trigger,
        activeChannels: state.activeChannels,
      }}
    >
      {children}
    </Provider>
  );
};

const useTemplateEditor = () => useContext(TemplateEditorContext);

export { TemplateEditorProvider, useTemplateEditor };
