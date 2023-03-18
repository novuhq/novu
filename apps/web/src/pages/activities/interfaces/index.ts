import { ScriptableContext } from 'chart.js';

export interface IChartData {
  datasets: IDataSet[];
  //labels: string[][];
}

export interface IDataSet {
  label: string;
  data: Array<IActivityGraphStats & { dateLabel: string }>;
  backgroundColor?: string;
  hoverBackgroundColor?: (context: ScriptableContext<'bar' | 'line'>) => CanvasGradient;
  borderRadius?: number;
  count: number;
}

export interface IActivityGraphStats {
  _id: any;
  count: number;
}
