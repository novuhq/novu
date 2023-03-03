import styled from '@emotion/styled';
import { ActionIcon, Divider, Stack } from '@mantine/core';
import { useFormContext } from 'react-hook-form';
import { StepTypeEnum } from '@novu/shared';

import { Button, colors, Text, Title } from '../../../../design-system';
import { Close } from '../../../../design-system/icons/actions/Close';
import { getChannel, NodeTypeEnum } from '../../shared/channels';
import type { IForm } from '../../components/formTypes';
import { StepActiveSwitch } from '../StepActiveSwitch';
import { useEnvController } from '../../../../hooks';
import { When } from '../../../../components/utils/When';
import { PlusCircle, Trash } from '../../../../design-system/icons';
import { DigestMetadata } from '../DigestMetadata';
import { DelayMetadata } from '../DelayMetadata';
import { Filters } from '../../filter/Filters';
import { ShouldStopOnFailSwitch } from '../ShouldStopOnFailSwitch';
import { ReplyCallback } from '../ReplyCallback';
import { NavSection } from '../../components/TemplatesSideBar';
import { StyledNav } from '../WorkflowEditor';
import { useTemplateEditorContext } from '../../editor/TemplateEditorProvider';

const capitalize = (text: string) => {
  return typeof text !== 'string' ? '' : text.charAt(0).toUpperCase() + text.slice(1);
};

export function SelectedStep({
  setActivePage,
  setFilterOpen,
  isLoading,
  isUpdateLoading,
  loadingEditTemplate,
  onDelete,
}: {
  setActivePage: (string) => void;
  setFilterOpen: (value: ((prevState: boolean) => boolean) | boolean) => void;
  isLoading: boolean;
  isUpdateLoading: boolean;
  loadingEditTemplate: boolean;
  onDelete: (id) => void;
}) {
  const {
    control,
    formState: { errors, isDirty },
  } = useFormContext<IForm>();
  const { selectedNodeId, setSelectedNodeId, activeStep, activeStepIndex, selectedChannel } =
    useTemplateEditorContext();
  const hasActiveStepSelected = activeStepIndex >= 0;
  const { readonly } = useEnvController();
  const onSideMenuClose = () => setSelectedNodeId('');

  return (
    <StyledNav data-test-id="step-properties-side-menu">
      <MenuBar>
        <Stack justify="flex-start" spacing="xs">
          <When truthy={selectedChannel !== StepTypeEnum.DIGEST && selectedChannel !== StepTypeEnum.DELAY}>
            <NavSection>
              <ButtonWrapper>
                <Title size={2}>{getChannel(selectedChannel ?? '')?.label} Properties</Title>
                <ActionIcon data-test-id="close-side-menu-btn" variant="transparent" onClick={onSideMenuClose}>
                  <Close />
                </ActionIcon>
              </ButtonWrapper>
            </NavSection>
            <NavSection>
              <EditTemplateButton
                mt={10}
                variant="outline"
                data-test-id="edit-template-channel"
                fullWidth
                onClick={() => {
                  setActivePage(
                    selectedChannel === StepTypeEnum.IN_APP ? selectedChannel : capitalize(selectedChannel ?? '')
                  );
                }}
              >
                {readonly ? 'View' : 'Edit'} Template
              </EditTemplateButton>
              <Divider my={30} />
              <When truthy={hasActiveStepSelected}>
                <Stack>
                  <StepActiveSwitch index={activeStepIndex} control={control} />
                  <ShouldStopOnFailSwitch index={activeStepIndex} control={control} />
                  <When truthy={selectedChannel === StepTypeEnum.EMAIL}>
                    <ReplyCallback index={activeStepIndex} control={control} errors={errors} />
                  </When>
                </Stack>
              </When>
            </NavSection>
            <NavSection>
              <Divider
                style={{
                  marginBottom: '15px',
                }}
                label="Filters"
                labelPosition="center"
              />
              {activeStep && <Filters step={activeStep} />}
              <FilterButton
                fullWidth
                variant="outline"
                onClick={() => {
                  setFilterOpen(true);
                }}
                disabled={readonly}
                data-test-id="add-filter-btn"
              >
                <PlusCircle
                  style={{
                    marginRight: '7px',
                  }}
                />
                Add filter
              </FilterButton>
            </NavSection>
          </When>
          <When truthy={selectedChannel === StepTypeEnum.DIGEST}>
            <NavSection>
              <ButtonWrapper>
                <Title size={2}>Digest Properties</Title>
                <ActionIcon data-test-id="close-side-menu-btn" variant="transparent" onClick={onSideMenuClose}>
                  <Close />
                </ActionIcon>
              </ButtonWrapper>
              <Text mr={10} mt={10} size="md" color={colors.B60}>
                Configure the digest parameters. Read more about the digest engine{' '}
                <a target={'_blank'} rel="noopener noreferrer" href={'https://docs.novu.co/platform/digest'}>
                  here
                </a>
                .
              </Text>
            </NavSection>
            <NavSection>
              <When truthy={hasActiveStepSelected}>
                <DigestMetadata
                  control={control}
                  index={activeStepIndex}
                  loading={isLoading || isUpdateLoading}
                  disableSubmit={readonly || loadingEditTemplate || isLoading || !isDirty}
                  onSideMenuClose={onSideMenuClose}
                />
              </When>
            </NavSection>
          </When>
          <When truthy={selectedChannel === StepTypeEnum.DELAY}>
            <NavSection>
              <ButtonWrapper>
                <Title size={2}>Delay Properties</Title>
                <ActionIcon data-test-id="close-side-menu-btn" variant="transparent" onClick={onSideMenuClose}>
                  <Close />
                </ActionIcon>
              </ButtonWrapper>
              <Text mr={10} mt={10} size="md" color={colors.B60}>
                Configure the delay parameters.
              </Text>
            </NavSection>
            <NavSection>
              {activeStepIndex > 0 && <DelayMetadata control={control} index={activeStepIndex} />}
            </NavSection>
          </When>
        </Stack>
        <DeleteStepButton
          mt={10}
          variant="outline"
          data-test-id="delete-step-button"
          onClick={() => {
            onDelete(selectedNodeId);
          }}
          disabled={readonly}
        >
          <Trash
            style={{
              marginRight: '5px',
            }}
          />
          Delete {getChannel(selectedChannel?.toString() ?? '')?.type === NodeTypeEnum.CHANNEL ? 'Step' : 'Action'}
        </DeleteStepButton>
      </MenuBar>
    </StyledNav>
  );
}

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const EditTemplateButton = styled(Button)`
  background-color: transparent;
`;

const FilterButton = styled(Button)`
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.white)};
  box-shadow: 0px 5px 20px rgb(0 0 0 / 20%);
  :hover {
    background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.white)};
  }
`;

const MenuBar = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  height: 100%;
`;

const DeleteStepButton = styled(Button)`
  //display: flex;
  //position: inherit;
  //bottom: 15px;
  //left: 20px;
  //right: 20px;
  background: rgba(229, 69, 69, 0.15);
  color: ${colors.error};
  box-shadow: none;
  :hover {
    background: rgba(229, 69, 69, 0.15);
  }
`;
