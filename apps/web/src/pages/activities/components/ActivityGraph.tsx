import styled from '@emotion/styled';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  PointElement,
  LineElement,
} from 'chart.js';
import { Line, Bar, getElementsAtEvent } from 'react-chartjs-2';
import { useEffect, useState, useRef } from 'react';
import { useMantineTheme } from '@mantine/core';
import { MessageContainer } from './MessageContainer';
import { ActivityGraphGlobalStyles } from './ActivityGraphGlobalStyles';
import { IChartData } from '../interfaces';
import { barChartOptions, lineChartOptions } from '../services';
import { PeriodicityEnum } from '@novu/shared';
import { Group, Text, Button, Grid } from '@mantine/core';
import { setYear, setWeek, setMonth, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

export function ActivityGraph({
  filterState,
  onFiltersChange,
  isPlaceholderData,
  chartData,
}: {
  filterState: any;
  onFiltersChange: any;
  isPlaceholderData: boolean;
  chartData: IChartData | undefined;
}) {
  const barRef = useRef();
  const lineRef = useRef();

  const [chartType, setChartType] = useState('line');
  const [datasetVisibility, setDatasetVisibility] =
    useState<[{ label: string; color: string; visible: boolean; count: number }]>();

  const [render, setRender] = useState(true);

  const isDark = useMantineTheme().colorScheme === 'dark';
  const getChart = () => (chartType === 'line' ? (lineRef.current as any) : (barRef.current as any));
  const updateDatasetVisibility = () => {
    const dataSets = chartData?.datasets;
    if (!dataSets) return;
    const visibilities: any = [];
    dataSets.forEach((dataset) => {
      let visibility: any = datasetVisibility?.find((val) => val.label === dataset.label);
      if (!visibility) {
        visibility = { label: dataset.label, color: dataset.backgroundColor, visible: true, count: 0 };
      }
      visibility.count = dataset.count;
      visibilities.push(visibility);
    });
    const chart = getChart();
    if (!chart) return;
    visibilities.forEach((dataSet, index) => {
      chart.setDatasetVisibility(index, dataSet.visible);
    });
    chart.update();
    setDatasetVisibility(visibilities);
  };
  useEffect(() => {
    if (chartData) updateDatasetVisibility();
  }, [chartData, chartType]);

  const toggleDataset = (index) => {
    if (!datasetVisibility || datasetVisibility.length <= index) return;
    const chart = getChart();

    datasetVisibility[index].visible = !datasetVisibility[index].visible;
    chart.setDatasetVisibility(index, datasetVisibility[index].visible);
    setDatasetVisibility([...datasetVisibility]);
    chart.update();
  };

  const onClick = (event) => {
    const chart = getChart();
    if (filterState.periodicity === PeriodicityEnum.DAILY) return;
    const barItems = getElementsAtEvent(chart, event);
    if (!barItems || barItems.length == 0) return;
    const { datasetIndex, index } = barItems[0];
    const item = chart.data.datasets[datasetIndex].data[index];
    const date = setYear(new Date(), item._id.year);
    if (filterState.periodicity === PeriodicityEnum.WEEKLY) {
      const newDate = setWeek(date, item._id.week);
      onFiltersChange({ range: [startOfWeek(newDate), endOfWeek(newDate)], periodicity: PeriodicityEnum.DAILY });
    } else {
      const newDate = setMonth(date, item._id.month);
      onFiltersChange({ range: [startOfMonth(newDate), endOfMonth(newDate)], periodicity: PeriodicityEnum.DAILY });
    }
  };

  return (
    <div>
      <ActivityGraphGlobalStyles isTriggerSent={!isPlaceholderData} isDark={isDark} />

      {!chartData ? (
        <Wrapper>
          <MessageContainer isDark={isDark} />
        </Wrapper>
      ) : (
        <>
          <Wrapper>
            {chartType === 'line' ? (
              <Line
                ref={lineRef}
                id="chart-line-styles"
                options={lineChartOptions}
                data={chartData}
                onClick={onClick}
              />
            ) : (
              <Bar ref={barRef} id="chart-bar-styles" options={barChartOptions} data={chartData} onClick={onClick} />
            )}
          </Wrapper>
          <Grid justify="space-between" mx={15} my={0}>
            <Button.Group>
              <Button
                {...buttonProperties}
                disabled={chartType === 'bar' ? true : false}
                onClick={() => setChartType('bar')}
              >
                Bar
              </Button>
              <Button
                {...buttonProperties}
                disabled={chartType === 'line' ? true : false}
                onClick={() => setChartType('line')}
              >
                Line
              </Button>
            </Button.Group>
            <Group position="center">
              {datasetVisibility &&
                datasetVisibility.map((dataSet, index) => (
                  <Button
                    onClick={() => toggleDataset(index)}
                    key={index}
                    color={dataSet.color}
                    size="sm"
                    compact
                    uppercase
                    variant={dataSet.visible ? 'filled' : 'outline'}
                  >
                    <Text strikethrough={dataSet.visible ? false : true}>
                      {dataSet.label?.replace('_', ' ') + ' ' + dataSet.count}
                    </Text>
                  </Button>
                ))}
            </Group>
            <Button.Group>
              <Button
                {...buttonProperties}
                disabled={filterState.periodicity === PeriodicityEnum.DAILY ? true : false}
                onClick={() => onFiltersChange({ periodicity: PeriodicityEnum.DAILY })}
              >
                Daily
              </Button>
              <Button
                {...buttonProperties}
                disabled={filterState.periodicity === PeriodicityEnum.WEEKLY ? true : false}
                onClick={() => onFiltersChange({ periodicity: PeriodicityEnum.WEEKLY })}
              >
                Weekly
              </Button>
              <Button
                {...buttonProperties}
                disabled={filterState.periodicity === PeriodicityEnum.MONTHLY ? true : false}
                onClick={() => onFiltersChange({ periodicity: PeriodicityEnum.MONTHLY })}
              >
                Monthly
              </Button>
            </Button.Group>
          </Grid>
        </>
      )}
    </div>
  );
}

const buttonProperties: any = { variant: 'default', size: 'sm', compact: true, uppercase: true };
const Wrapper = styled.div`
  padding: 15px;
  height: 375px;
  display: flex;
  align-items: center;
  flex-direction: column;
`;
