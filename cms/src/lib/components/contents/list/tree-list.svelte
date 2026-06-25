<script>
  import { EmptyState } from '@sveltia/ui';

  import ListContainer from '$lib/components/common/list-container.svelte';
  import TreeNode from '$lib/components/contents/list/tree-node.svelte';
  import { goto } from '$lib/services/app/navigation';
  import { selectedCollection } from '$lib/services/contents/collection';
  import { entryGroups } from '$lib/services/contents/collection/view';

  const collection = $derived(/** @type {any} */ ($selectedCollection));
  const collectionName = $derived(collection?.name);

  const allEntries = $derived($entryGroups.flatMap(({ entries }) => entries));

  const tree = $derived.by(() => {
    const roots = [];
    const children = new Map();
    for (const entry of allEntries) {
      const parent = (entry.locales?._default?.content?.parent) || '';
      if (parent) {
        if (!children.has(parent)) children.set(parent, []);
        children.get(parent).push(entry);
      } else {
        roots.push(entry);
      }
    }
    return { roots, children };
  });

  function goToEntry(entry) {
    goto(`/collections/${collectionName}/entries/${entry.subPath}`, {
      transitionType: 'forwards',
    });
  }
</script>

<main>
  {#if allEntries.length > 0}
    <ListContainer>
      <div class="tree-list">
        {#each tree.roots as entry (entry.subPath)}
          <TreeNode {entry} depth={0} children={tree.children} onGo={goToEntry} />
        {/each}
      </div>
    </ListContainer>
  {:else}
    <EmptyState icon="article" message="No entries yet" />
  {/if}
</main>

<style>
  .tree-list {
    display: flex;
    flex-direction: column;
  }
</style>
