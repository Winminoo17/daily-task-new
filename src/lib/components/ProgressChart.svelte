<script lang="ts">
  import { onMount } from 'svelte';
  import { ChevronLeft, ChevronRight, Target, TrendingUp } from 'lucide-svelte';
  import { addWeeks, addYears, startOfWeek, format, eachDayOfInterval, endOfWeek } from 'date-fns';
  import type { Chart as ChartType } from 'chart.js';

  type Progress = {
    progress_date: string;
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number | null;
  };
  type Task = {
    task_date: string;
    status: string;
  };

  let { history = [], tasks = [], today }: {
    history: Progress[];
    tasks?: Task[];
    today: string;
  } = $props();

  let mode = $state<'daily' | 'monthly'>('daily');
  let offset = $state(0);
  let canvas: HTMLCanvasElement;
  let chart: ChartType | undefined;
  let loaded = false;
  let ChartJS: typeof import('chart.js').Chart;

  const asDate = (iso: string) => new Date(`${iso}T12:00:00`);
  const reference = $derived(asDate(today));

  // Archived dates remain the source of truth after their tasks are deleted.
  // Any dates with active (not-yet-archived) tasks are calculated live.
  const records = $derived.by(() => {
    const result = new Map<string, number | null>();
    for (const row of history) {
      result.set(row.progress_date, row.completion_rate === null ? null : Number(row.completion_rate));
    }

    const liveCounts = new Map<string, { total: number; completed: number }>();
    for (const task of tasks) {
      // Never include future tasks in a completed-day history series.
      if (task.task_date > today) continue;
      const counts = liveCounts.get(task.task_date) ?? { total: 0, completed: 0 };
      counts.total += 1;
      if (task.status === 'done') counts.completed += 1;
      liveCounts.set(task.task_date, counts);
    }
    for (const [date, counts] of liveCounts) {
      // Current live task state takes precedence; for previously archived days,
      // stored progress remains authoritative when no active rows exist.
      result.set(date, counts.total ? Math.round(counts.completed * 10000 / counts.total) / 100 : null);
    }
    return result;
  });

  const dates = $derived.by(() => {
    if (mode === 'daily') {
      const start = startOfWeek(addWeeks(reference, offset), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 1 }) });
    }
    const year = addYears(reference, offset).getFullYear();
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1, 12));
  });

  const points = $derived(dates.map((date) => {
    if (mode === 'daily') return records.get(format(date, 'yyyy-MM-dd')) ?? null;
    const month = format(date, 'yyyy-MM');
    const values = [...records.entries()]
      .filter(([dateKey, rate]) => dateKey.startsWith(month) && rate !== null)
      .map(([, rate]) => rate as number);
    return values.length
      ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
      : null;
  }));
  const labels = $derived(dates.map((date) => format(date, mode === 'daily' ? 'EEE d' : 'MMM')));
  const validPoints = $derived(points.filter((value): value is number => value !== null));
  const average = $derived(validPoints.length
    ? Math.round(validPoints.reduce((sum, value) => sum + value, 0) / validPoints.length)
    : null);
  const aboveTarget = $derived(validPoints.filter((value) => value >= 60).length);
  const periodTitle = $derived(mode === 'daily'
    ? `${format(dates[0], 'MMM d')} – ${format(dates[6], 'MMM d, yyyy')}`
    : format(dates[0], 'yyyy'));

  function draw(currentLabels: string[], currentPoints: (number | null)[]) {
    if (!canvas || !ChartJS) return;
    chart?.destroy();
    chart = new ChartJS(canvas, {
      type: 'line',
      data: {
        labels: currentLabels,
        datasets: [
          {
            label: 'Completion rate',
            data: currentPoints,
            borderColor: '#356be6',
            backgroundColor: 'rgba(53,107,230,.09)',
            pointBackgroundColor: '#356be6',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: .32,
            fill: true,
            spanGaps: false
          },
          {
            label: '60% target',
            data: currentLabels.map(() => 60),
            borderColor: '#16a34a',
            borderDash: [6, 6],
            pointRadius: 0,
            borderWidth: 2,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 220 },
        interaction: { intersect: false, mode: 'index' },
        scales: {
          y: { min: 0, max: 100, ticks: { stepSize: 20, callback: (value) => `${value}%` }, grid: { color: '#edf1f7' }, border: { display: false } },
          x: { grid: { display: false }, border: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y === null ? 'No data' : ctx.parsed.y + '%'}`
            }
          }
        }
      }
    });
  }

  onMount(() => {
    let disposed = false;
    void import('chart.js').then((mod) => {
      if (disposed) return;
      mod.Chart.register(...mod.registerables);
      ChartJS = mod.Chart;
      loaded = true;
      draw(labels, points);
    });
    return () => {
      disposed = true;
      chart?.destroy();
    };
  });

  $effect(() => {
    const currentLabels = labels;
    const currentPoints = points;
    if (loaded) draw(currentLabels, currentPoints);
  });
</script>

<section class="card chart-card">
  <div class="chart-top">
    <div>
      <div class="eyebrow"><TrendingUp size={15} /> YOUR MOMENTUM</div>
      <h2>Productivity progress</h2>
      <p class="subtle">Live daily progress and your saved monthly trends.</p>
    </div>
    <div class="segmented">
      <button type="button" class:active={mode === 'daily'} onclick={() => { mode = 'daily'; offset = 0; }}>Daily</button>
      <button type="button" class:active={mode === 'monthly'} onclick={() => { mode = 'monthly'; offset = 0; }}>Monthly</button>
    </div>
  </div>
  <div class="chart-controls">
    <div class="arrows">
      <button type="button" aria-label="Previous period" onclick={() => offset--}><ChevronLeft size={17} /></button>
      <span>{periodTitle}</span>
      <button type="button" aria-label="Next period" onclick={() => offset++} disabled={offset >= 0}><ChevronRight size={17} /></button>
    </div>
    <div class="average"><span>Average</span><strong>{average === null ? '—' : `${average}%`}</strong></div>
  </div>
  <div class="chart-canvas"><canvas bind:this={canvas} aria-label="Productivity completion percentage graph"></canvas></div>
  <div class="chart-bottom">
    <span class="chart-legend"><i class="dot blue"></i> Completion rate</span>
    <span class="chart-legend"><i class="line-dotted"></i><Target size={14} color="#16a34a" /> 60% target</span>
    <span class="goal-days">{aboveTarget}/{validPoints.length} periods reached target</span>
  </div>
</section>
