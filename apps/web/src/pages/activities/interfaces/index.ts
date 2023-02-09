import { ScriptableContext } from 'chart.js';
import { ChannelTypeEnum } from '@novu/shared';

export interface IChartData {
  datasets: IDataSet[];
  labels: string[][];
}

export interface IDataSet {
  data: Array<IActivityGraphStats & { dateLabel: string }>;
  backgroundColor: string;
  hoverBackgroundColor: (context: ScriptableContext<'bar'>) => CanvasGradient;
  borderRadius: number;
}

export interface IActivityGraphStats {
  _id: string;
  count: number;
  templates: string[];
  channels: ChannelTypeEnum[];
}
