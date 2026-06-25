<script>
  import { _ } from '@sveltia/i18n';
  import { EmptyState, GridBody } from '@sveltia/ui';
  import { sleep } from '@sveltia/utils/misc';
  import { onMount } from 'svelte';

  import ListContainer from '$lib/components/common/list-container.svelte';
  import ListingGrid from '$lib/components/common/listing-grid.svelte';
  import LoadMoreScroll from '$lib/components/common/load-more-scroll.svelte';
  import EntryListItem from '$lib/components/contents/list/entry-list-item.svelte';
  import EntryReorderList from '$lib/components/contents/list/entry-reorder-list.svelte';
  import TreeList from '$lib/components/contents/list/tree-list.svelte';
  import CreateEntryButton from '$lib/components/contents/toolbar/create-entry-button.svelte';
  import { backend } from '$lib/services/backends';
  import { selectedCollection } from '$lib/services/contents/collection';
  import {
    currentView,
    entryGroups,
    listedEntries,
    reordering,
  } from '$lib/services/contents/collection/view';
  import { collectionPagination } from '$lib/services/contents';

  /**
   * @import { Entry, InternalEntryCollection } from '$lib/types/private';
   */

  const collection = $derived(
    /** @type {InternalEntryCollection | undefined} */ ($selectedCollection),
  );
  const collectionName = $derived(collection?.name);
  const viewType = $derived($reordering ? 'list' : $currentView.type);
  const allEntries = $derived($entryGroups.flatMap(({ entries }) => entries));

  // Pagination state for the current collection
  const pagination = $derived(
    collectionName ? $collectionPagination[collectionName] : undefined,
  );
  const isTreeCollection = $derived(
    (collection?.fields || []).some((f) => f.name === 'parent'),
  );

  const hasMore = $derived(pagination?.hasMore ?? false);
  const pageLoading = $derived(pagination?.loading ?? false);
  const currentPage = $derived(pagination?.page ?? 1);
  const totalPages = $derived(pagination?.totalPages ?? 1);

  // Detect sort changes to reset and reload page 1
  let lastSortKey = /** @type {string | undefined} */ ($currentView.sort?.key);
  let lastSortOrder = /** @type {string | undefined} */ ($currentView.sort?.order);

  const sortChanged = $derived.by(() => {
    const { key, order } = $currentView.sort ?? {};
    if (key !== lastSortKey || order !== lastSortOrder) {
      lastSortKey = key;
      lastSortOrder = order;
      return true;
    }
    return false;
  });

  // When sort changes, reset the collection and reload page 1
  $effect(() => {
    if (sortChanged && collectionName && pagination?.total) {
      goToPage(1);
    }
  });

  /** Track which collection we last loaded, to detect switches */
  let lastLoadedCollection = /** @type {string | undefined} */ (undefined);

  // On mount / collection switch: replace initial full load with just the first page
  $effect(() => {
    const backendSvc = $backend;
    if (!backendSvc?.fetchCollectionPage || !collectionName) return;
    if (collectionName === lastLoadedCollection) return;
    lastLoadedCollection = collectionName;

    // Skip if we already have paginated data for this collection
    if ($collectionPagination[collectionName]?.total) return;

    // Reset & load page 1
    if (backendSvc.resetCollection) {
      backendSvc.resetCollection(collectionName).then(() => {
        const { key, order } = $currentView.sort ?? {};
        backendSvc.fetchCollectionPage?.({
          collection: collectionName,
          page: 1,
          sort: key,
          order,
        });
      });
    }
  });

  /**
   * Navigate to a specific page (replaces current page; only page 1 triggers reset).
   */
  const goToPage = async (/** @type {number} */ page) => {
    if (pageLoading || !collectionName) return;
    const backendSvc = $backend;
    if (!backendSvc?.fetchCollectionPage) return;

    // Always reset before loading a page (avoids mixing entries from different pages)
    if (backendSvc.resetCollection) {
      await backendSvc.resetCollection(collectionName);
    }

    const { key, order } = $currentView.sort ?? {};
    await backendSvc.fetchCollectionPage({
      collection: collectionName,
      page,
      sort: key,
      order,
    });
  };
</script>

<ListContainer aria-label={_('entry_list')}>
  {#if collection}
    {#if isTreeCollection}
      <TreeList />
    {:else if allEntries.length}
      {@const { defaultLocale } = collection._i18n}
      <ListingGrid
        {viewType}
        id="entry-list"
        aria-label={_('entries')}
        aria-rowcount={pagination?.total ?? $listedEntries.length}
      >
        <!-- @todo Implement custom table column option that can replace summary template -->
        {#if $reordering}
          <EntryReorderList {collection} {viewType} />
        {:else}
          {#each $entryGroups as { name, entries } (name)}
            {#await sleep() then}
              <GridBody label={name !== '*' ? name : undefined}>
                <LoadMoreScroll
                  items={entries.filter(
                    ({ locales }) =>
                      !!(locales[defaultLocale] ?? Object.values(locales)[0])?.content,
                  )}
                  itemKey="id"
                  {currentPage}
                  {totalPages}
                  loading={pageLoading}
                  onGoToPage={goToPage}
                >
                  {#snippet renderItem(/** @type {Entry} */ entry)}
                    {#await sleep() then}
                      <EntryListItem {collection} {entry} {viewType} />
                    {/await}
                  {/snippet}
                </LoadMoreScroll>
              </GridBody>
            {/await}
          {/each}
        {/if}
      </ListingGrid>
    {:else if $listedEntries.length}
      <EmptyState>
        <span role="none">{_('no_entries_found')}</span>
      </EmptyState>
    {:else}
      <EmptyState>
        <span role="none">{_('no_entries_created')}</span>
        <CreateEntryButton collectionName={collection.name} label={_('create_new_entry')} />
      </EmptyState>
    {/if}
  {:else}
    <EmptyState>
      <span role="none">{_('collection_not_found')}</span>
    </EmptyState>
  {/if}
</ListContainer>
