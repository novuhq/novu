import { ScriptableContext } from 'chart.js';

export interface IChartData {
  datasets: IDataSet[];
  labels: string[][];
}

export interface IDataSet {
  data: number[];
  backgroundColor: string;
  hoverBackgroundColor: (context: ScriptableContext<'bar'>) => CanvasGradient;
  borderRadius: number;
}

export interface IActivityGraphStats {
  _id: string;
  count: number;
}
