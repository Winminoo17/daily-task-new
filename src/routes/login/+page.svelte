<script lang="ts">import { enhance } from '$app/forms';
import { LockKeyhole, CheckCircle2, ArrowRight } from 'lucide-svelte';

let { form } = $props(); let busy = $state(false);</script>
<svelte:head><title>Sign in · My Day</title></svelte:head>
<main class="auth-shell"><div class="auth-card"><div class="brand"><div class="brand-icon"><CheckCircle2 size={21}/></div><span>my day<span class="brand-dot">.</span></span></div><div class="auth-illustration"><LockKeyhole size={30}/></div><h1>Welcome back</h1><p class="subtle">Sign in to your private productivity workspace.</p>
<form method="POST" use:enhance={() => {busy=true;return async ({ update }) => {await update();busy=false}}} class="form-stack"><label>Email<input name="email" type="email" autocomplete="username" placeholder="you@example.com" required /></label><label>Password<input name="password" type="password" autocomplete="current-password" required /></label>{#if form?.message}<div class="alert">{form.message}</div>{/if}<button class="btn primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17}/></button></form><p class="footnote">Private account only. New registrations are disabled.</p></div></main>
