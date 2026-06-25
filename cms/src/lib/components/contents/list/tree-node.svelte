<script>
  import { selectedEntries } from '$lib/services/contents/collection/entries';

  let { entry, depth = 0, children, onGo } = $props();

  const title = $derived(entry.locales?._default?.content?.title || entry.subPath || '');
  const hasKids = $derived(children.has(entry.subPath));
  const kids = $derived(hasKids ? children.get(entry.subPath) : []);

  let selected = $state(false);

  $effect(() => {
    const entries = $selectedEntries;
    selected = entries.some((e) => e.subPath === entry.subPath);
  });

  function toggleSelect(e) {
    e.stopPropagation();
    selectedEntries.update((entries) => {
      const idx = entries.findIndex((e) => e.subPath === entry.subPath);
      if (idx === -1) {
        entries.push(entry);
      } else {
        entries.splice(idx, 1);
      }
      return entries;
    });
  }

  function handleClick(e) {
    if (e.target.type === 'checkbox') return;
    onGo(entry);
  }
</script>

<button class="tree-row" class:selected style="padding-left: {16 + depth * 24}px" onclick={handleClick}>
  <input type="checkbox" checked={selected} onchange={toggleSelect} class="tree-check" />
  <span class="tree-icon">{depth > 0 ? '├─' : '📄'}</span>
  <span class="tree-label">{title}</span>
</button>

{#if hasKids}
  {#each kids as child (child.subPath)}
    <svelte:self entry={child} depth={depth + 1} {children} {onGo} />
  {/each}
{/if}

<style>
  .tree-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    font-size: 14px;
    color: var(--sui-primary-foreground-color);
    border-bottom: 1px solid var(--sui-border-color, #eee);
    transition: background 0.15s;
    width: 100%;
  }
  .tree-row:hover {
    background: var(--sui-tertiary-background-color, #f5f5f5);
  }
  .tree-row.selected {
    background: var(--sui-highlight-background-color, #e6f7ff);
  }
  .tree-check {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--sui-accent-color, #0066cc);
  }
  .tree-icon {
    font-size: 13px;
    color: var(--sui-secondary-foreground-color, #999);
    flex-shrink: 0;
    width: 20px;
    text-align: center;
  }
  .tree-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
