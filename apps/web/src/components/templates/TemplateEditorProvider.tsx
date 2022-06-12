import { ChannelTypeEnum, INotificationTrigger } from '@novu/shared';
import { createContext, useContext, useReducer } from 'react';

const actionEditMode = 'editMode';
const actionIsDirty = 'isDirty';
const actionIsEmbedModalVisible = 'isEmbedModalVisible';
const actionTrigger = 'trigger';

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
} as {
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  isEmbedModalVisible: boolean;
  setIsEmbedModalVisible: (isEmbedModalVisible: boolean) => void;
  trigger: INotificationTrigger | undefined;
  setTrigger: (trigger: INotificationTrigger) => void;
  [key: string]: any;
});

const { Provider } = TemplateEditorContext;

const TemplateEditorProvider = ({ children }) => {
  const [state, dispatch]: [any, any] = useReducer(reducer, {
    editMode: true,
    isDirty: false,
    isEmbedModalVisible: false,
    trigger: undefined,
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

  return (
    <Provider
      value={{
        setTrigger,
        setIsDirty,
        setEditMode,
        setIsEmbedModalVisible,
        editMode: state.editMode,
        isDirty: state.isDirty,
        isEmbedModalVisible: state.isEmbedModalVisible,
        trigger: state.trigger,
      }}
    >
      {children}
    </Provider>
  );
};

const useTemplateEditor = () => useContext(TemplateEditorContext);

export { TemplateEditorProvider, useTemplateEditor };
