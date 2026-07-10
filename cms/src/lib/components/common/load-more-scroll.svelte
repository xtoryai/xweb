<script>
  import { _ } from '@sveltia/i18n';
  import { Button, Spacer } from '@sveltia/ui';
  import { onMount } from 'svelte';

  /**
   * @import { Snippet } from 'svelte';
   */

  /**
   * @typedef {object} Props
   * @property {any[]} items Item list (may change when pages are loaded).
   * @property {string} itemKey Item key used for the `{#each}` loop.
   * @property {number} [itemChunkSize] Number of items to progressively reveal at once (default 25).
   * @property {number} [currentPage] Current page number (1-based).
   * @property {number} [totalPages] Total number of pages.
   * @property {boolean} [loading] Whether a page fetch is in progress.
   * @property {(page: number) => Promise<void>} [onGoToPage] Callback to navigate to a specific page.
   * @property {Snippet<[any, number]>} renderItem Snippet to render each item.
   */

  /** @type {Props} */
  let {
    items = [],
    itemKey,
    itemChunkSize = 25,
    currentPage = 1,
    totalPages = 1,
    loading = false,
    onGoToPage = undefined,
    renderItem,
  } = $props();

  let revealedCount = $state(0);
  /** @type {HTMLElement | undefined} */
  let sentinelEl = $state();

  // Track previous items length to detect resets
  let prevItemsLength = 0;
  $effect(() => {
    if (items.length < prevItemsLength) {
      // Collection shrunk (filter applied, switched to smaller collection, etc.)
      revealedCount = Math.min(itemChunkSize, items.length);
    } else if (revealedCount === 0 && items.length > 0) {
      // Initial render — show first chunk
      revealedCount = Math.min(itemChunkSize, items.length);
    } else if (items.length > prevItemsLength) {
      // Items grew but IntersectionObserver may not fire because the sentinel
      // is already visible in the viewport. Reveal the new items immediately.
      revealedCount = Math.min(revealedCount + itemChunkSize, items.length);
    }
    prevItemsLength = items.length;
  });

  // IntersectionObserver for progressive DOM reveal
  onMount(() => {
    if (!sentinelEl) return;
    const obs = new IntersectionObserver(
      () => {
        if (revealedCount < items.length) {
          revealedCount = Math.min(revealedCount + itemChunkSize, items.length);
        }
      },
      { rootMargin: '200px' },
    );
    obs.observe(sentinelEl);
    return () => obs.disconnect();
  });

  const visible = $derived(items.slice(0, revealedCount));

  /**
   * Build the list of page numbers to display (with ellipsis for large ranges).
   * @returns {(number | '…')[]}
   */
  function pageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = /** @type {(number | '…')[]} */ ([1]);
    if (currentPage > 3) pages.push('…');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }

  async function goTo(page) {
    if (page === currentPage || loading || !onGoToPage) return;
    await onGoToPage(page);
  }
</script>

{#each visible as item, i (item[itemKey] ?? i)}
  {@render renderItem(item, i)}
{/each}

<div bind:this={sentinelEl} class="pagination-bar">
  {#if loading}
    <div class="spinner-wrap">
      <div class="spinner"></div>
      <span>{_('loading')}</span>
    </div>
  {:else if totalPages > 1}
    <nav class="pager" aria-label="Pagination">
      <Button
        variant="secondary"
        label={_('previous')}
        disabled={currentPage <= 1}
        onclick={() => goTo(currentPage - 1)}
      />
      {#each pageNumbers() as p}
        {#if p === '…'}
          <span class="ellipsis">…</span>
        {:else}
          <Button
            variant={p === currentPage ? 'primary' : 'secondary'}
            label={String(p)}
            disabled={loading}
            onclick={() => goTo(/** @type {number} */ (p))}
          />
        {/if}
      {/each}
      <Button
        variant="secondary"
        label={_('next')}
        disabled={currentPage >= totalPages}
        onclick={() => goTo(currentPage + 1)}
      />
    </nav>
  {/if}
</div>

<style>
  .pagination-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 48px;
    padding: 16px 0;
  }

  .pager {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .ellipsis {
    padding: 0 4px;
    color: var(--sui-secondary-foreground-color);
    user-select: none;
  }

  .spinner-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--sui-secondary-foreground-color);
    font-size: var(--sui-font-size-small);
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid var(--sui-border-color);
    border-top-color: var(--sui-primary-accent-color);
    border-radius: 50%;
    animation: lms-spin 0.6s linear infinite;
  }

  @keyframes lms-spin {
    to { transform: rotate(360deg); }
  }
</style>
