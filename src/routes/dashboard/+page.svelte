
<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    Check,
    Plus,
    CalendarDays,
    ListTodo,
    CircleCheck,
    Clock3,
    LogOut,
    Trash2,
    Pencil,
    X,
    Flag,
    CheckCircle2,
    BarChart3,
    Sparkles
  } from 'lucide-svelte';

  import ProgressChart from '$lib/components/ProgressChart.svelte';

  let { data, form }: { data: any; form: any } = $props();

  let showAdd = $state(false);
  let editing = $state<string | null>(null);
  let filter = $state<'all' | 'todo' | 'done'>('all');

  // Today's task calculations
  const todayTasks = $derived(
    data.tasks.filter((t: any) => t.task_date === data.today)
  );

  const finished = $derived(
    todayTasks.filter((t: any) => t.status === 'done').length
  );

  const total = $derived(todayTasks.length);
  const remaining = $derived(total - finished);

  const pct = $derived(
    total ? Math.round((finished * 100) / total) : 0
  );

  const visible = $derived(
    todayTasks.filter(
      (t: any) =>
        filter === 'all' ||
        (filter === 'done'
          ? t.status === 'done'
          : t.status !== 'done')
    )
  );

  const formattedToday = $derived(
    new Date(`${data.today}T12:00:00`).toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }
    )
  );
</script>

<svelte:head>
  <title>My Day · Personal Task Tracker</title>
  <meta
    name="description"
    content="Your private daily task tracker and productivity graph"
  />
</svelte:head>

<div class="app-shell">

  <!-- DESKTOP SIDEBAR -->
  <aside class="sidebar">
    <a href="/dashboard" class="brand">
      <div class="brand-icon">
        <Check size={19} />
      </div>
      <span>my day<span class="brand-dot">.</span></span>
    </a>

    <div class="sidebar-section-label">WORKSPACE</div>

    <a href="#top" class="nav-link active">
      <ListTodo size={18} />
      My dashboard
    </a>

    <a href="#progress" class="nav-link muted">
      <BarChart3 size={18} />
      Productivity
    </a>

    <div class="sidebar-footer">
      <div class="user-bubble">
        {data.userEmail?.[0]?.toUpperCase()}
      </div>

      <div class="user-details">
        <strong>Personal space</strong>
        <small title={data.userEmail}>
          {data.userEmail}
        </small>
      </div>

      <form method="POST" action="?/logout">
        <button
          type="submit"
          class="icon-btn"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={17} />
        </button>
      </form>
    </div>
  </aside>

  <!-- MAIN DASHBOARD -->
  <main class="main" id="top">

    <!-- TOP BAR -->
    <header class="topbar">
      <div class="breadcrumb">
        Workspace <span>/</span> <strong>Dashboard</strong>
      </div>

      <div class="topbar-right">
        <span class="private-pill">
          <span class="online-dot"></span>
          Private workspace
        </span>

        <div class="top-avatar">
          {data.userEmail?.[0]?.toUpperCase()}
        </div>

        <!-- MOBILE LOGOUT -->
        <form
          class="mobile-logout"
          method="POST"
          action="?/logout"
        >
          <button
            type="submit"
            class="icon-btn"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={19} />
          </button>
        </form>
      </div>
    </header>

    <div class="content">

      <!-- GREETING -->
      <div class="greeting">
        <div>
          <div class="eyebrow">
            <Sparkles size={15} />
            YOUR DAILY FOCUS
          </div>

          <h1>
            Make today count<span class="blue-text">.</span>
          </h1>

          <p>One task at a time. You've got this.</p>
        </div>

        <div class="date-chip">
          <CalendarDays size={17} />
          {formattedToday}
        </div>
      </div>

      <!-- ERROR MESSAGES -->
      {#if data.dbError}
        <div class="alert">
          Database: {data.dbError}.
          Make sure you ran
          <code>supabase/schema.sql</code>.
        </div>
      {/if}

      {#if form?.message}
        <div class="alert">
          {form.message}
        </div>
      {/if}

      <!-- TASK STATISTICS -->
      <div class="stat-grid">

        <div class="stat card">
          <div class="stat-icon lavender">
            <ListTodo size={21} />
          </div>

          <span>Today's tasks</span>
          <strong>{total}</strong>
          <small>Planned for today</small>
        </div>

        <div class="stat card">
          <div class="stat-icon mint">
            <CircleCheck size={21} />
          </div>

          <span>Completed</span>
          <strong>{finished}</strong>
          <small>Keep up the great work</small>
        </div>

        <div class="stat card">
          <div class="stat-icon peach">
            <Clock3 size={21} />
          </div>

          <span>Remaining</span>
          <strong>{remaining}</strong>
          <small>You've got this!</small>
        </div>

      </div>

      <!-- TODAY'S PROGRESS -->
      <div class="card focus-card">
        <div class="focus-heading">
          <div>
            <h2>Today's progress</h2>
            <p class="subtle">
              A little progress every day adds up.
            </p>
          </div>

          <strong class="progress-number">
            {pct}<small>%</small>
          </strong>
        </div>

        <div class="progress-track">
          <div
            class="progress-fill"
            style:width={`${pct}%`}
          ></div>
        </div>

        <div class="progress-label">
          <span>
            {finished} of {total} tasks completed
          </span>

          <span>
            {pct >= 60
              ? '🌟 Daily goal reached!'
              : 'Your target is 60%'}
          </span>
        </div>
      </div>

      <!-- TASK CHECKLIST -->
      <section
        id="tasks"
        class="card task-card"
      >

        <div class="section-heading">
          <div>
            <h2>Today's checklist</h2>
            <p class="subtle">
              Stay organized, stay inspired.
            </p>
          </div>

          <button
            type="button"
            class="btn primary"
            onclick={() => showAdd = !showAdd}
          >
            <Plus size={16} />
            New task
          </button>
        </div>

        <!-- ADD TASK FORM -->
        {#if showAdd}
          <form
            class="task-form"
            method="POST"
            action="?/add"
            use:enhance={() => {
              return async ({ update, result }) => {
                await update();

                if (result.type === 'success') {
                  showAdd = false;
                }
              };
            }}
          >
            <input
              name="title"
              placeholder="What do you want to get done?"
              maxlength="180"
              required
            />

            <textarea
              name="description"
              placeholder="Optional notes"
              rows="2"
              maxlength="1000"
            ></textarea>

            <div class="form-actions">
              <label>
                Priority
                <select name="priority">
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label>
                Date
                <input
                  name="task_date"
                  type="date"
                  value={data.today}
                  required
                />
              </label>

              <button type="submit" class="btn primary">
                Save task
              </button>

              <button
                type="button"
                class="btn soft"
                onclick={() => showAdd = false}
              >
                Cancel
              </button>
            </div>
          </form>
        {/if}

        <!-- FILTER TABS -->
        <div class="filter-tabs">
          <button
            type="button"
            class:chosen={filter === 'all'}
            onclick={() => filter = 'all'}
          >
            All <span>{total}</span>
          </button>

          <button
            type="button"
            class:chosen={filter === 'todo'}
            onclick={() => filter = 'todo'}
          >
            To do <span>{remaining}</span>
          </button>

          <button
            type="button"
            class:chosen={filter === 'done'}
            onclick={() => filter = 'done'}
          >
            Completed <span>{finished}</span>
          </button>
        </div>

        <!-- TASK LIST -->
        <div class="task-list">

          {#each visible as task (task.id)}

            <div class="task-row">

              <!-- COMPLETE TASK -->
              <form
                method="POST"
                action="?/toggle"
                use:enhance
              >
                <input
                  type="hidden"
                  name="id"
                  value={task.id}
                />

                <input
                  type="hidden"
                  name="status"
                  value={task.status === 'done'
                    ? 'todo'
                    : 'done'}
                />

                <button
                  type="submit"
                  class="task-check"
                  class:checked={task.status === 'done'}
                  aria-label={task.status === 'done'
                    ? 'Mark incomplete'
                    : 'Complete task'}
                >
                  {#if task.status === 'done'}
                    <Check size={15} />
                  {/if}
                </button>
              </form>

              <!-- TASK DETAILS -->
              <div class="task-body">
                <div
                  class="task-title"
                  class:done={task.status === 'done'}
                >
                  {task.title}
                </div>

                {#if task.description}
                  <div class="task-description">
                    {task.description}
                  </div>
                {/if}
              </div>

              <!-- PRIORITY -->
              <span
                class="priority"
                class:high={task.priority === 'high'}
                class:low={task.priority === 'low'}
              >
                <Flag size={12} />
                {task.priority}
              </span>

              <!-- EDIT BUTTON -->
              <button
                type="button"
                class="icon-btn"
                aria-label="Edit task"
                onclick={() =>
                  editing = editing === task.id
                    ? null
                    : task.id
                }
              >
                <Pencil size={16} />
              </button>

              <!-- DELETE TASK -->
              <form
                method="POST"
                action="?/delete"
                use:enhance
                onsubmit={(e) => {
                  if (!confirm('Delete this task?')) {
                    e.preventDefault();
                  }
                }}
              >
                <input
                  type="hidden"
                  name="id"
                  value={task.id}
                />

                <button
                  type="submit"
                  class="icon-btn delete"
                  aria-label="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              </form>
            </div>

            <!-- EDIT TASK FORM -->
            {#if editing === task.id}
              <form
                class="task-form edit-form"
                method="POST"
                action="?/edit"
                use:enhance={() => {
                  return async ({ update, result }) => {
                    await update();

                    if (result.type === 'success') {
                      editing = null;
                    }
                  };
                }}
              >
                <input
                  type="hidden"
                  name="id"
                  value={task.id}
                />

                <input
                  name="title"
                  value={task.title}
                  required
                  maxlength="180"
                />

                <textarea
                  name="description"
                  rows="2"
                  maxlength="1000"
                >{task.description || ''}</textarea>

                <div class="form-actions">
                  <label>
                    Priority
                    <select
                      name="priority"
                      value={task.priority}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>

                  <label>
                    Date
                    <input
                      name="task_date"
                      type="date"
                      value={task.task_date}
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    class="btn primary"
                  >
                    Save changes
                  </button>

                  <button
                    type="button"
                    class="btn soft"
                    onclick={() => editing = null}
                  >
                    <X size={15} />
                    Cancel
                  </button>
                </div>
              </form>
            {/if}

          {:else}
            <div class="empty">
              <div class="empty-icon">
                <CheckCircle2 size={25} />
              </div>

              <strong>
                {filter === 'done'
                  ? 'No completed tasks yet'
                  : 'All clear!'}
              </strong>

              <p>
                {filter === 'done'
                  ? 'Finish a task to see it here.'
                  : 'Add a new task or enjoy your free time.'}
              </p>
            </div>
          {/each}

        </div>
      </section>

      <!-- PRODUCTIVITY GRAPH -->
      <div id="progress">
        <ProgressChart
          history={data.history}
          tasks={data.tasks}
          today={data.today}
        />
      </div>

      <!-- ARCHIVE INFORMATION -->
      <div class="bottom-note">
        Daily progress is archived automatically after
        midnight Bangkok time when you enable the
        Supabase cron job. Your chart retains historical
        scores after tasks are removed.
      </div>

    </div>
  </main>

  <!-- MOBILE BOTTOM NAVIGATION -->
  <nav
    class="mobile-bottom-nav"
    aria-label="Mobile navigation"
  >
    <a href="#top">
      <ListTodo size={21} />
      <span>Today</span>
    </a>

    <a href="#tasks">
      <CheckCircle2 size={21} />
      <span>Tasks</span>
    </a>

    <a href="#progress">
      <BarChart3 size={21} />
      <span>Progress</span>
    </a>
  </nav>

</div>
