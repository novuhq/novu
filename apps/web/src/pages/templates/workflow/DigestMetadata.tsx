import { Accordion, Group, useMantineColorScheme } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { DigestTypeEnum } from '@novu/shared';

import { When } from '../../../components/utils/When';
import { colors, Input, Select, Tooltip, Bell, Digest, Timer } from '@novu/design-system';
import { TypeSegmented } from './digest/TypeSegment';
import { WillBeSentHeader } from './digest/WillBeSentHeader';
import { RegularInfo } from './digest/icons/RegularInfo';
import { TimedDigestMetadata } from './TimedDigestMetadata';
import { RegularDigestMetadata } from './RegularDigestMetadata';
import { StepSettings } from './SideBar/StepSettings';
import { useEnvController } from '../../../hooks';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';

const GroupStyled = styled(Group)`
  gap: 18px;
`;

export const DigestMetadata = () => {
  const { template } = useTemplateEditorForm();
  const { readonly } = useEnvController({}, template?.chimera);
  const stepFormPath = useStepFormPath();
  const { control, watch } = useFormContext();

  const { colorScheme } = useMantineColorScheme();

  const type = watch(`${stepFormPath}.digestMetadata.type`);
  const digestKey = watch(`${stepFormPath}.digestMetadata.digestKey`);

  return (
    <div data-test-id="digest-step-settings-interval">
      <StepSettings />
      <Accordion mt={16} styles={{ item: { '&:last-of-type': { marginBottom: 0 } } }}>
        <Tooltip
          position="left"
          width={227}
          multiline
          label="Types of events that will be aggregated from the previous digest to the time it will be sent"
        >
          <Accordion.Item value="events-selection" data-test-id="digest-events-selection-options">
            <Accordion.Control>
              <GroupStyled>
                <Bell color={colors.B60} />
                <div>
                  <div>
                    <b
                      style={{
                        color: colorScheme === 'dark' ? colors.B80 : colors.B40,
                      }}
                    >
                      All events
                    </b>
                  </div>
                  <div>since previous digest</div>
                </div>
              </GroupStyled>
            </Accordion.Control>
            <Accordion.Panel>
              <Select mt={-5} mb={-5} data={[{ value: 'all', label: 'All events' }]} value={'all'} />
            </Accordion.Panel>
          </Accordion.Item>
        </Tooltip>
        <Tooltip
          position="left"
          width={227}
          multiline
          label={
            <>
              Events aggregated by subscriberId by default, this can’t be changed. You may add additional aggregations
              by typing the name of a variable.
            </>
          }
        >
          <Accordion.Item value="group-by" data-test-id="digest-group-by-options">
            <Accordion.Control>
              <GroupStyled>
                <div style={{ width: 26 }}>
                  <Digest color={colors.B60} />
                </div>
                <div>
                  <div>
                    <b>Aggregated by subscriberId</b>
                  </div>
                  <When truthy={!digestKey}>
                    <div>Add another aggregation key</div>
                  </When>
                  <When truthy={digestKey}>
                    <div>
                      And by{' '}
                      <b
                        style={{
                          color: colorScheme === 'dark' ? colors.B80 : colors.B40,
                        }}
                      >
                        {digestKey}
                      </b>
                    </div>
                  </When>
                </div>
              </GroupStyled>
            </Accordion.Control>
            <Accordion.Panel>
              <Controller
                control={control}
                name={`${stepFormPath}.digestMetadata.digestKey`}
                defaultValue=""
                render={({ field, fieldState }) => {
                  return (
                    <Input
                      {...field}
                      mt={-5}
                      mb={-5}
                      value={field.value || ''}
                      placeholder="Post_ID, Attribute_ID, etc."
                      error={fieldState.error?.message}
                      type="text"
                      data-test-id="batch-key"
                      disabled={readonly}
                    />
                  );
                }}
              />
            </Accordion.Panel>
          </Accordion.Item>
        </Tooltip>
        <Accordion.Item value="send" data-test-id="digest-send-options">
          <Accordion.Control>
            <GroupStyled>
              <Timer width="30" height="30" color={colors.B60} />
              <div>
                <div>
                  <b>Will be sent</b>
                </div>
                <div>
                  <WillBeSentHeader path={stepFormPath} />
                </div>
              </div>
            </GroupStyled>
          </Accordion.Control>
          <Accordion.Panel>
            <Controller
              control={control}
              defaultValue={DigestTypeEnum.REGULAR}
              name={`${stepFormPath}.digestMetadata.type`}
              render={({ field }) => {
                return (
                  <TypeSegmented
                    {...field}
                    sx={{
                      maxWidth: '100% !important',
                      marginBottom: -14,
                    }}
                    fullWidth
                    disabled={readonly}
                    data={[
                      {
                        value: DigestTypeEnum.REGULAR,
                        label: (
                          <Tooltip
                            withinPortal
                            width={310}
                            multiline
                            offset={15}
                            label={
                              <>
                                <div>
                                  Digest starts after the first event occurred since the previous sent digest. From that
                                  moment on, it aggregates events for the specified time, after which it sends a digest
                                  of the events.
                                </div>
                                <RegularInfo />
                              </>
                            }
                          >
                            <div>Event</div>
                          </Tooltip>
                        ),
                      },
                      {
                        value: DigestTypeEnum.TIMED,
                        label: (
                          <Tooltip
                            withinPortal
                            width={240}
                            multiline
                            offset={15}
                            label="Digest aggregates the events in between the selected time period"
                          >
                            <div>Schedule</div>
                          </Tooltip>
                        ),
                      },
                    ]}
                    data-test-id="digest-type"
                  />
                );
              }}
            />
            <div
              style={{
                background: colorScheme === 'dark' ? colors.B20 : colors.BGLight,
                padding: 16,
                borderRadius: 8,
              }}
            >
              {type === DigestTypeEnum.TIMED && <TimedDigestMetadata />}
              {type === DigestTypeEnum.REGULAR && <RegularDigestMetadata />}
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
