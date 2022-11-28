import { useContext, useState } from 'react';
import { EmailContentCard } from './EmailContentCard';
import { AuthContext } from '../../../store/authContext';
import { When } from '../../utils/When';
import { Preview } from '../../../pages/templates/editor/Preview';
import { EditorPreviewSwitch } from '../EditorPreviewSwitch';
import { Grid, Group, JsonInput, SegmentedControl, useMantineTheme } from '@mantine/core';
import { TestSendEmail } from './TestSendEmail';
import { colors } from '../../../design-system';
import { MobileIcon } from '../../../pages/templates/editor/PreviewSegment/MobileIcon';
import { WebIcon } from '../../../pages/templates/editor/PreviewSegment/WebIcon';
import { Collapse, UnstyledButton } from '@mantine/core';
import { useFormContext, useWatch } from 'react-hook-form';
import { SystemVariablesWithTypes } from '@novu/shared';
import { ChevronUp } from '../../../design-system/icons';
import { ChevronDown } from '../../../design-system/icons/arrows/ChevronDown';
import { ChevronRight } from '../../../design-system/icons/arrows/ChevronRight';
import { ChevronLeft } from '../../../design-system/icons/arrows/ChevronLeft';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useProcessVariables } from '../../../hooks/use-process-variables';

const VarLabel = ({ label, children }) => {
  const [open, setOpen] = useState(true);

  return (
    <>
      <UnstyledButton
        onClick={() => {
          setOpen(!open);
        }}
        type="button"
        sx={{
          width: '100%',
          marginBottom: 15,
        }}
      >
        <div
          style={{
            color: colors.white,
            fontSize: 14,
            fontWeight: 'bold',
          }}
        >
          {label}:
          <span
            style={{
              float: 'right',
            }}
          >
            {open ? <ChevronUp /> : <ChevronDown />}
          </span>
        </div>
      </UnstyledButton>
      <Collapse in={open}>{children}</Collapse>
    </>
  );
};

const VarItem = ({ name, type, children = null }: { name: string; type: string; children?: any }) => {
  return (
    <div
      style={{
        marginBottom: 10,
        padding: 10,
        borderRadius: 7,
        background: colors.B20,
        color: colors.B60,
      }}
    >
      "{name}":"{type}"{children}
    </div>
  );
};

const VarItemsDropdown = ({ name, type }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <UnstyledButton
        onClick={() => {
          setOpen(!open);
        }}
        type="button"
        sx={{
          width: '100%',
        }}
      >
        <VarItem name={name} type="object">
          <span
            style={{
              float: 'right',
            }}
          >
            {open ? <ChevronUp /> : <ChevronDown />}
          </span>
        </VarItem>
      </UnstyledButton>
      <Collapse in={open}>
        <div
          style={{
            borderBottom: `1px solid #292933`,
            marginBottom: 10,
            paddingLeft: 12,
          }}
        >
          {Object.keys(type).map((key) => {
            return <VarItem name={key} type={type[key]} />;
          })}
        </div>
      </Collapse>
    </>
  );
};

export enum ViewEnum {
  EDIT = 'Edit',
  PREVIEW = 'Preview',
  TEST = 'Test',
}

export function EmailMessagesCards({
  index,
  variables,
  isIntegrationActive,
}: {
  index: number;
  variables: { name: string }[];
  isIntegrationActive: boolean;
}) {
  const { currentOrganization } = useContext(AuthContext);
  const [view, setView] = useState<ViewEnum>(ViewEnum.EDIT);
  const [preview, setPreview] = useState<'mobile' | 'web'>('web');
  const theme = useMantineTheme();
  const { control } = useFormContext();
  const [showVarManagement, setShowVarManagement] = useState(true);
  const variableArray = useWatch({
    name: `steps.${index}.template.variables`,
    control,
  });

  const processedVars = useProcessVariables(variableArray);

  return (
    <>
      <Group position="apart" mb={view === ViewEnum.PREVIEW ? 40 : 20}>
        <div>
          <EditorPreviewSwitch view={view} setView={setView} />
        </div>
        <When truthy={view === ViewEnum.PREVIEW}>
          <div>
            <SegmentedControl
              styles={{
                root: {
                  background: 'transparent',
                  border: `1px solid ${theme.colorScheme === 'dark' ? colors.B40 : colors.B70}`,
                  borderRadius: '30px',
                },
                control: {
                  width: '70px',
                },
                active: {
                  background: theme.colorScheme === 'dark' ? colors.white : colors.B98,
                  borderRadius: '30px',
                },
                labelActive: {
                  color: `${colors.B40} !important`,
                },
              }}
              data={[
                {
                  value: 'web',
                  label: <WebIcon />,
                },
                {
                  value: 'mobile',
                  label: <MobileIcon />,
                },
              ]}
              value={preview}
              onChange={(value: any) => {
                setPreview(value);
              }}
              defaultValue={preview}
              fullWidth
            />
          </div>
        </When>
        <When truthy={view === ViewEnum.EDIT}>
          <div>
            <UnstyledButton
              type="button"
              onClick={() => {
                setShowVarManagement(!showVarManagement);
              }}
            >
              {showVarManagement ? <ChevronRight /> : <ChevronLeft />}
            </UnstyledButton>
          </div>
        </When>
      </Group>
      <When truthy={view === ViewEnum.PREVIEW}>
        <Preview activeStep={index} view={preview} />
      </When>
      <When truthy={view === ViewEnum.TEST}>
        <TestSendEmail isIntegrationActive={isIntegrationActive} index={index} />
      </When>
      <When truthy={view === ViewEnum.EDIT}>
        <Grid grow>
          <Grid.Col span={showVarManagement ? 8 : 12}>
            <EmailContentCard
              key={index}
              organization={currentOrganization}
              variables={variables}
              index={index}
              isIntegrationActive={isIntegrationActive}
            />
          </Grid.Col>
          <Grid.Col
            span={showVarManagement ? 4 : 0}
            sx={{
              maxWidth: '325px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: colors.B17,
                borderRadius: 7,
                padding: 15,
              }}
            >
              <VarLabel label="System Vars">
                {Object.keys(SystemVariablesWithTypes).map((name) => {
                  const type = SystemVariablesWithTypes[name];

                  if (typeof type === 'object') {
                    return <VarItemsDropdown name={name} type={type} />;
                  }

                  return <VarItem name={name} type={type} />;
                })}
              </VarLabel>
              <div
                style={{
                  marginTop: '20px',
                }}
              >
                <VarLabel label="Step Vars">
                  {variableArray.map((item) => {
                    return <VarItem name={item.name} type={item.type.toLowerCase()} />;
                  })}
                </VarLabel>
              </div>
              <div
                style={{
                  marginTop: '20px',
                }}
              >
                <VarLabel label="JSON">
                  <JsonInput
                    data-test-id="test-email-json-param"
                    formatOnBlur
                    autosize
                    styles={inputStyles}
                    value={processedVars}
                    disabled
                    minRows={6}
                  />
                </VarLabel>
              </div>
            </div>
          </Grid.Col>
        </Grid>
      </When>
    </>
  );
}
