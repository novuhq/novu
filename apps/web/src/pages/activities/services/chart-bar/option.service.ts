const total = (tooltipItems) => {
  if (tooltipItems.length <= 1) return '';
  let sum = 0;
  tooltipItems.forEach((tooltipItem) => (sum += tooltipItem.parsed.y));

  return 'Total: ' + sum;
};

const createOptions = (type) => {
  return {
    maintainAspectRatio: false,
    responsive: true,
    height: 300,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: type === 'bar' ? ('x' as const) : ('point' as const),
        itemSort: (a, b) => {
          return b.datasetIndex - a.datasetIndex;
        },
        filter: (tooltipItem) => tooltipItem.parsed.y > 0,
        callbacks: {
          label: (context) => (context.dataset.label as string).toUpperCase() + ': ' + context.parsed.y,
          title: (context) => context[0].dataset.data[0].xTitle,
          footer: total,
        },
      },
    },
    interaction: {
      //mode: type === 'bar' ? ('x' as const) : ('point' as const),
      mode: 'index' as const,
      //mode: 'nearest' as const,
      intersect: true,
    },
    parsing: {
      xAxisKey: 'xLabel',
      yAxisKey: 'count',
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
      },
      y: {
        stacked: true,
        grid: { display: false },
      },
    },
  };
};
export const barChartOptions = createOptions('bar');
export const lineChartOptions = createOptions('line');
