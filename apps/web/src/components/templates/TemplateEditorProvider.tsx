import { ChannelTypeEnum, INotificationTrigger } from '@novu/shared';
import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

const actionEditMode = 'editMode';
const actionIsDirty = 'isDirty';
const actionIsEmbedModalVisible = 'isEmbedModalVisible';
const actionTrigger = 'trigger';
const actionCreatedTemplateId = 'createdTemplateId';

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
    case actionCreatedTemplateId:
      return {
        ...state,
        createdTemplateId: action.payload,
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
  createdTemplateId: '',
  setCreatedTemplateId: (createdTemplateId: string) => {},
} as {
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  isEmbedModalVisible: boolean;
  setIsEmbedModalVisible: (isEmbedModalVisible: boolean) => void;
  trigger: INotificationTrigger | undefined;
  setTrigger: (trigger: INotificationTrigger) => void;
  createdTemplateId: string;
  setCreatedTemplateId: (createdTemplateId: string) => void;
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

  const setEditMode = useCallback(
    (editMode: boolean) => {
      dispatch({
        type: actionEditMode,
        payload: editMode,
      });
    },
    [dispatch]
  );

  const setIsDirty = useCallback(
    (isDirty: boolean) => {
      dispatch({
        type: actionIsDirty,
        payload: isDirty,
      });
    },
    [dispatch]
  );

  const setIsEmbedModalVisible = useCallback(
    (isEmbedModalVisible: boolean) => {
      dispatch({
        type: actionIsEmbedModalVisible,
        payload: isEmbedModalVisible,
      });
    },
    [dispatch]
  );

  const setTrigger = useCallback(
    (trigger: INotificationTrigger) => {
      dispatch({
        type: actionTrigger,
        payload: trigger,
      });
    },
    [dispatch]
  );

  const setCreatedTemplateId = useCallback(
    (createdTemplateId: string) => {
      dispatch({
        type: actionCreatedTemplateId,
        payload: createdTemplateId,
      });
    },
    [dispatch]
  );

  const value = useMemo(
    () => ({
      setTrigger,
      setIsDirty,
      setEditMode,
      setIsEmbedModalVisible,
      setCreatedTemplateId,
      editMode: state.editMode,
      isDirty: state.isDirty,
      isEmbedModalVisible: state.isEmbedModalVisible,
      trigger: state.trigger,
      createdTemplateId: state.createdTemplateId,
    }),
    [setTrigger, setIsDirty, setEditMode, setIsEmbedModalVisible, setCreatedTemplateId, state]
  );

  return (
    <Provider
      value={{
        setTrigger,
        setIsDirty,
        setEditMode,
        setIsEmbedModalVisible,
        setCreatedTemplateId,
        editMode: state.editMode,
        isDirty: state.isDirty,
        isEmbedModalVisible: state.isEmbedModalVisible,
        trigger: state.trigger,
        createdTemplateId: state.createdTemplateId,
      }}
    >
      {children}
    </Provider>
  );
};

const useTemplateEditor = () => useContext(TemplateEditorContext);

export { TemplateEditorProvider, useTemplateEditor };
